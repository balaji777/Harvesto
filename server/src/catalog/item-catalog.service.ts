import { Injectable, NotFoundException } from '@nestjs/common';
import { StoragePool } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ItemSellInfo {
  itemTypeId: string;
  name: string;
  sellPriceCoins: number;
  /** Where this item type lives in inventory: crops in the Silo, everything else in the Barn. */
  pool: StoragePool;
}

/**
 * Resolves an itemTypeId (crop, animal product, or factory good) to its
 * name/price/storage-pool. Shared by InventoryService (selling), AnimalService
 * and BuildingService (collecting), and OrderService (truck order rewards) so
 * that lookup logic lives in exactly one place — see GAME_DESIGN.md §8's
 * "itemTypeId" note on InventoryItem.
 */
@Injectable()
export class ItemCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getSellInfo(itemTypeId: string): Promise<ItemSellInfo> {
    const crop = await this.prisma.cropType.findUnique({ where: { id: itemTypeId } });
    if (crop) {
      return { itemTypeId, name: crop.name, sellPriceCoins: crop.sellPriceCoins, pool: StoragePool.SILO };
    }

    const animalType = await this.prisma.animalType.findFirst({ where: { productItemId: itemTypeId } });
    if (animalType) {
      return { itemTypeId, name: animalType.productName, sellPriceCoins: animalType.productSellPriceCoins, pool: StoragePool.BARN };
    }

    const recipe = await this.prisma.recipe.findFirst({ where: { outputItemId: itemTypeId } });
    if (recipe) {
      return { itemTypeId, name: recipe.name, sellPriceCoins: recipe.outputSellPriceCoins, pool: StoragePool.BARN };
    }

    throw new NotFoundException(`Unknown item type "${itemTypeId}"`);
  }
}
