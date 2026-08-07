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

const MIN_ITEMS_PER_ORDER = 1;
const MAX_ITEMS_PER_ORDER = 2;
const MIN_QUANTITY = 3;
const MAX_QUANTITY = 8;
const REWARD_MULTIPLIER = 1.5;
const XP_PER_UNIT = 2;

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
    private readonly inventoryService: InventoryService,
    private readonly itemCatalog: ItemCatalogService,
    private readonly playerStatsService: PlayerStatsService,
  ) {}

  /** Returns the player's active truck orders, generating fresh ones to top up to the slot count. */
  async getActiveTruckOrders(userId: string) {
    const now = new Date();
    const active = await this.prisma.order.findMany({
      where: { userId, source: OrderSource.TRUCK, fulfilledAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'asc' },
    });

    const deficit = GAME_CONFIG.TRUCK_ORDER_SLOT_COUNT - active.length;
    if (deficit <= 0) return active;

    const profile = await this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
    const pool = await this.getUnlockedSellableItems(profile.level);

    const generated = [];
    for (let i = 0; i < deficit; i++) {
      generated.push(await this.generateOrder(userId, pool));
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
    const { level, leveledUp } = await this.economyService.addXp(userId, order.rewardXp);
    await this.prisma.order.update({ where: { id: orderId }, data: { fulfilledAt: new Date() } });
    await this.playerStatsService.recordEvent(userId, 'ordersFulfilled');

    return { rewardCoins: order.rewardCoins, rewardXp: order.rewardXp, level, leveledUp };
  }

  private async generateOrder(userId: string, pool: { itemTypeId: string; sellPriceCoins: number }[]) {
    const itemCount = randomInt(MIN_ITEMS_PER_ORDER, Math.min(MAX_ITEMS_PER_ORDER, pool.length));
    const chosen = shuffle(pool).slice(0, itemCount);

    const requirements: OrderRequirement[] = chosen.map((item) => ({
      itemTypeId: item.itemTypeId,
      quantity: randomInt(MIN_QUANTITY, MAX_QUANTITY),
    }));

    const totalValue = requirements.reduce((sum, req) => {
      const item = chosen.find((c) => c.itemTypeId === req.itemTypeId)!;
      return sum + item.sellPriceCoins * req.quantity;
    }, 0);
    const totalQuantity = requirements.reduce((sum, req) => sum + req.quantity, 0);

    return this.prisma.order.create({
      data: {
        userId,
        source: OrderSource.TRUCK,
        requirements: requirements as unknown as Prisma.InputJsonValue,
        rewardCoins: Math.round(totalValue * REWARD_MULTIPLIER),
        rewardXp: Math.round(totalQuantity * XP_PER_UNIT),
        expiresAt: new Date(Date.now() + GAME_CONFIG.TRUCK_ORDER_EXPIRY_MINUTES * 60 * 1000),
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
