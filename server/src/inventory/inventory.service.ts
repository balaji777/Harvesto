import { BadRequestException, Injectable } from '@nestjs/common';
import { StoragePool } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { ItemCatalogService } from '../catalog/item-catalog.service';
import { GAME_CONFIG } from '../common/constants/game-config';

const CAPACITY_BY_POOL: Record<StoragePool, number> = {
  [StoragePool.SILO]: GAME_CONFIG.SILO_CAPACITY,
  [StoragePool.BARN]: GAME_CONFIG.BARN_CAPACITY,
};

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
    private readonly itemCatalog: ItemCatalogService,
  ) {}

  async getInventory(userId: string) {
    const [silo, barn] = await Promise.all([
      this.getPool(userId, StoragePool.SILO),
      this.getPool(userId, StoragePool.BARN),
    ]);
    return { silo, barn };
  }

  private async getPool(userId: string, pool: StoragePool) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { userId, storagePool: pool },
      orderBy: { itemTypeId: 'asc' },
    });
    const used = items.reduce((sum, item) => sum + item.quantity, 0);
    return { capacity: CAPACITY_BY_POOL[pool], used, items };
  }

  /** Called by FarmService (SILO), AnimalService/BuildingService (BARN). Throws if that pool has no room. */
  async addToInventory(userId: string, itemTypeId: string, quantity: number, pool: StoragePool): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const used = await tx.inventoryItem.aggregate({
        where: { userId, storagePool: pool },
        _sum: { quantity: true },
      });
      const currentUsed = used._sum.quantity ?? 0;

      if (currentUsed + quantity > CAPACITY_BY_POOL[pool]) {
        const poolName = pool === StoragePool.SILO ? 'Silo' : 'Barn';
        throw new BadRequestException(`${poolName} is full — sell or use goods first`);
      }

      await tx.inventoryItem.upsert({
        where: { userId_itemTypeId_storagePool: { userId, itemTypeId, storagePool: pool } },
        update: { quantity: { increment: quantity } },
        create: { userId, itemTypeId, storagePool: pool, quantity },
      });
    });
  }

  /**
   * Validates and deducts several items atomically — if any is short, none
   * are removed. Shared by AnimalService (feeding), BuildingService
   * (crafting ingredients), and OrderService (fulfilling truck orders).
   */
  async removeManyFromInventory(
    userId: string,
    items: { itemTypeId: string; quantity: number; pool: StoragePool }[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const { itemTypeId, quantity, pool } of items) {
        const item = await tx.inventoryItem.findUnique({
          where: { userId_itemTypeId_storagePool: { userId, itemTypeId, storagePool: pool } },
        });
        if (!item || item.quantity < quantity) {
          const poolName = pool === StoragePool.SILO ? 'silo' : 'barn';
          throw new BadRequestException(`Not enough ${itemTypeId} in the ${poolName}`);
        }
      }
      for (const { itemTypeId, quantity, pool } of items) {
        await tx.inventoryItem.update({
          where: { userId_itemTypeId_storagePool: { userId, itemTypeId, storagePool: pool } },
          data: { quantity: { decrement: quantity } },
        });
      }
    });
  }

  async sell(userId: string, itemTypeId: string, quantity: number): Promise<{ coinsEarned: number }> {
    const { sellPriceCoins, pool } = await this.itemCatalog.getSellInfo(itemTypeId);

    const item = await this.prisma.inventoryItem.findUnique({
      where: { userId_itemTypeId_storagePool: { userId, itemTypeId, storagePool: pool } },
    });

    if (!item || item.quantity < quantity) {
      const poolName = pool === StoragePool.SILO ? 'silo' : 'barn';
      throw new BadRequestException(`Not enough ${itemTypeId} in the ${poolName}`);
    }

    await this.prisma.inventoryItem.update({
      where: { userId_itemTypeId_storagePool: { userId, itemTypeId, storagePool: pool } },
      data: { quantity: { decrement: quantity } },
    });

    const coinsEarned = sellPriceCoins * quantity;
    await this.economyService.addCoins(userId, coinsEarned, 'sell');
    return { coinsEarned };
  }
}
