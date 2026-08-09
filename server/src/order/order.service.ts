import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { InventoryService } from '../inventory/inventory.service';
import { ItemCatalogService } from '../catalog/item-catalog.service';
import { PlayerStatsService } from '../progression/player-stats.service';
import { GAME_CONFIG } from '../common/constants/game-config';

export interface OrderRequirement {
  itemTypeId: string;
  quantity: number;
}

interface OrderSourceConfig {
  slotCount: number;
  expiryMinutes: number;
  unlockLevel: number;
  minItems: number;
  maxItems: number;
  minQuantity: number;
  maxQuantity: number;
  rewardMultiplier: number;
  xpPerUnit: number;
  /** Boat/train orders pay a diamond bonus scaled to order value; truck orders don't. */
  diamondsPerValue: number;
}

// Boat and train orders are bigger, rarer, and pay noticeably better than
// truck orders, in that order — see GAME_DESIGN.md §6.11. Train orders'
// cooperative multi-neighbor version isn't built (no Neighborhoods yet),
// so this is just the single-player top tier.
const ORDER_CONFIG: Record<OrderSource, OrderSourceConfig> = {
  TRUCK: {
    slotCount: GAME_CONFIG.TRUCK_ORDER_SLOT_COUNT,
    expiryMinutes: GAME_CONFIG.TRUCK_ORDER_EXPIRY_MINUTES,
    unlockLevel: 1,
    minItems: 1,
    maxItems: 2,
    minQuantity: 3,
    maxQuantity: 8,
    rewardMultiplier: 1.5,
    xpPerUnit: 2,
    diamondsPerValue: 0,
  },
  BOAT: {
    slotCount: GAME_CONFIG.BOAT_ORDER_SLOT_COUNT,
    expiryMinutes: GAME_CONFIG.BOAT_ORDER_EXPIRY_MINUTES,
    unlockLevel: GAME_CONFIG.BOAT_UNLOCK_LEVEL,
    minItems: 3,
    maxItems: 4,
    minQuantity: 10,
    maxQuantity: 20,
    rewardMultiplier: 2.2,
    xpPerUnit: 3,
    diamondsPerValue: 1 / 50,
  },
  TRAIN: {
    slotCount: GAME_CONFIG.TRAIN_ORDER_SLOT_COUNT,
    expiryMinutes: GAME_CONFIG.TRAIN_ORDER_EXPIRY_MINUTES,
    unlockLevel: GAME_CONFIG.TRAIN_UNLOCK_LEVEL,
    minItems: 4,
    maxItems: 5,
    minQuantity: 20,
    maxQuantity: 35,
    rewardMultiplier: 3.0,
    xpPerUnit: 4,
    diamondsPerValue: 1 / 30,
  },
};

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
    private readonly inventoryService: InventoryService,
    private readonly itemCatalog: ItemCatalogService,
    private readonly playerStatsService: PlayerStatsService,
  ) {}

  /** Returns the player's active orders for a source, generating fresh ones to top up to the slot count. */
  async getActiveOrders(userId: string, source: OrderSource) {
    const config = ORDER_CONFIG[source];
    const now = new Date();
    const active = await this.prisma.order.findMany({
      where: { userId, source, fulfilledAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'asc' },
    });

    const deficit = config.slotCount - active.length;
    if (deficit <= 0) return active;

    const profile = await this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
    if (profile.level < config.unlockLevel) {
      return active; // Not unlocked yet — nothing generated, but don't error either.
    }

    const pool = await this.getUnlockedSellableItems(profile.level);
    const generated = [];
    for (let i = 0; i < deficit; i++) {
      generated.push(await this.generateOrder(userId, source, config, pool));
    }
    return [...active, ...generated];
  }

  async fulfill(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) throw new NotFoundException('Order not found');
    if (order.fulfilledAt) throw new BadRequestException('Order already fulfilled');
    if (order.expiresAt <= new Date()) throw new BadRequestException('Order has expired');

    const requirements = order.requirements as unknown as OrderRequirement[];
    const itemsWithPool = await Promise.all(
      requirements.map(async (req) => {
        const { pool } = await this.itemCatalog.getSellInfo(req.itemTypeId);
        return { itemTypeId: req.itemTypeId, quantity: req.quantity, pool };
      }),
    );
    await this.inventoryService.removeManyFromInventory(userId, itemsWithPool);

    await this.economyService.addCoins(userId, order.rewardCoins, 'order_reward');
    if (order.rewardDiamonds > 0) {
      await this.economyService.addDiamonds(userId, order.rewardDiamonds, 'order_reward');
    }
    const { level, leveledUp } = await this.economyService.addXp(userId, order.rewardXp);
    await this.prisma.order.update({ where: { id: orderId }, data: { fulfilledAt: new Date() } });
    await this.playerStatsService.recordEvent(userId, 'ordersFulfilled');

    return { rewardCoins: order.rewardCoins, rewardDiamonds: order.rewardDiamonds, rewardXp: order.rewardXp, level, leveledUp };
  }

  private async generateOrder(
    userId: string,
    source: OrderSource,
    config: OrderSourceConfig,
    pool: { itemTypeId: string; sellPriceCoins: number }[],
  ) {
    const itemCount = randomInt(config.minItems, Math.min(config.maxItems, pool.length));
    const chosen = shuffle(pool).slice(0, itemCount);

    const requirements: OrderRequirement[] = chosen.map((item) => ({
      itemTypeId: item.itemTypeId,
      quantity: randomInt(config.minQuantity, config.maxQuantity),
    }));

    const totalValue = requirements.reduce((sum, req) => {
      const item = chosen.find((c) => c.itemTypeId === req.itemTypeId)!;
      return sum + item.sellPriceCoins * req.quantity;
    }, 0);
    const totalQuantity = requirements.reduce((sum, req) => sum + req.quantity, 0);

    return this.prisma.order.create({
      data: {
        userId,
        source,
        requirements: requirements as unknown as Prisma.InputJsonValue,
        rewardCoins: Math.round(totalValue * config.rewardMultiplier),
        rewardDiamonds: Math.round(totalValue * config.diamondsPerValue),
        rewardXp: Math.round(totalQuantity * config.xpPerUnit),
        expiresAt: new Date(Date.now() + config.expiryMinutes * 60 * 1000),
      },
    });
  }

  /** Crops + animal products + factory goods unlocked at or below the given level. */
  private async getUnlockedSellableItems(level: number): Promise<{ itemTypeId: string; sellPriceCoins: number }[]> {
    const [crops, animalTypes, recipes] = await Promise.all([
      this.prisma.cropType.findMany({ where: { unlockLevel: { lte: level } } }),
      this.prisma.animalType.findMany({ where: { unlockLevel: { lte: level } } }),
      this.prisma.recipe.findMany({ where: { unlockLevel: { lte: level } } }),
    ]);

    return [
      ...crops.map((c) => ({ itemTypeId: c.id, sellPriceCoins: c.sellPriceCoins })),
      ...animalTypes.map((a) => ({ itemTypeId: a.productItemId, sellPriceCoins: a.productSellPriceCoins })),
      ...recipes.map((r) => ({ itemTypeId: r.outputItemId, sellPriceCoins: r.outputSellPriceCoins })),
    ];
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
