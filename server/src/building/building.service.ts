import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BuildingCategory, StoragePool } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { InventoryService } from '../inventory/inventory.service';
import { ItemCatalogService } from '../catalog/item-catalog.service';
import { PlayerStatsService } from '../progression/player-stats.service';
import { TownService } from '../town/town.service';

@Injectable()
export class BuildingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
    private readonly inventoryService: InventoryService,
    private readonly itemCatalog: ItemCatalogService,
    private readonly playerStatsService: PlayerStatsService,
    private readonly townService: TownService,
  ) {}

  async listBuildingTypes() {
    return this.prisma.buildingType.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async listRecipes(buildingTypeId?: string) {
    return this.prisma.recipe.findMany({
      where: buildingTypeId ? { buildingTypeId } : undefined,
      include: { ingredients: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listMyBuildings(userId: string) {
    return this.prisma.building.findMany({
      where: { userId },
      include: {
        buildingType: true,
        animals: { include: { animalType: true } },
        queueEntries: { where: { collectedAt: null }, include: { recipe: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async buy(userId: string, buildingTypeId: string) {
    const [profile, buildingType, existing] = await Promise.all([
      this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } }),
      this.prisma.buildingType.findUnique({ where: { id: buildingTypeId } }),
      this.prisma.building.findUnique({ where: { userId_buildingTypeId: { userId, buildingTypeId } } }),
    ]);
    if (!buildingType) throw new NotFoundException(`Unknown building type "${buildingTypeId}"`);
    if (buildingType.unlockLevel > profile.level) {
      throw new ForbiddenException(`${buildingType.name} unlocks at level ${buildingType.unlockLevel}`);
    }
    if (existing) throw new BadRequestException(`You already own a ${buildingType.name}`);

    await this.economyService.addCoins(userId, -buildingType.purchaseCostCoins, 'building_purchase');
    return this.prisma.building.create({ data: { userId, buildingTypeId }, include: { buildingType: true } });
  }

  async craft(userId: string, buildingId: string, recipeId: string) {
    const [profile, building, recipe] = await Promise.all([
      this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } }),
      this.prisma.building.findUnique({ where: { id: buildingId }, include: { buildingType: true } }),
      this.prisma.recipe.findUnique({ where: { id: recipeId }, include: { ingredients: true } }),
    ]);
    if (!building || building.userId !== userId) throw new NotFoundException('Building not found');
    if (building.buildingType.category !== BuildingCategory.FACTORY) {
      throw new BadRequestException(`${building.buildingType.name} can't craft recipes`);
    }
    if (!recipe) throw new NotFoundException(`Unknown recipe "${recipeId}"`);
    if (recipe.buildingTypeId !== building.buildingTypeId) {
      throw new BadRequestException(`${recipe.name} isn't made in ${building.buildingType.name}`);
    }
    if (recipe.unlockLevel > profile.level) {
      throw new ForbiddenException(`${recipe.name} unlocks at level ${recipe.unlockLevel}`);
    }
    if (recipe.requiresTownShopId && !(await this.townService.isStaffed(userId, recipe.requiresTownShopId))) {
      throw new ForbiddenException(`${recipe.name} needs its Town shop staffed first`);
    }

    const activeCount = await this.prisma.buildingQueueEntry.count({ where: { buildingId, collectedAt: null } });
    if (activeCount >= building.buildingType.capacity) {
      throw new BadRequestException(`${building.buildingType.name}'s queue is full`);
    }

    const ingredientsWithPool = await Promise.all(
      recipe.ingredients.map(async (ingredient) => {
        const { pool } = await this.itemCatalog.getSellInfo(ingredient.itemTypeId);
        return { itemTypeId: ingredient.itemTypeId, quantity: ingredient.quantity, pool };
      }),
    );
    await this.inventoryService.removeManyFromInventory(userId, ingredientsWithPool);

    const readyAt = new Date(Date.now() + recipe.craftTimeSeconds * 1000);
    return this.prisma.buildingQueueEntry.create({
      data: { buildingId, recipeId, readyAt },
      include: { recipe: true },
    });
  }

  async collect(userId: string, queueEntryId: string) {
    const entry = await this.prisma.buildingQueueEntry.findUnique({
      where: { id: queueEntryId },
      include: { recipe: true, building: true },
    });
    if (!entry || entry.building.userId !== userId) throw new NotFoundException('Nothing to collect');
    if (entry.collectedAt) throw new BadRequestException('Already collected');
    if (entry.readyAt > new Date()) throw new BadRequestException('Not ready yet');

    // Barn-full check happens inside addToInventory; if it throws, the
    // queue entry stays uncollected so the player can retry.
    await this.inventoryService.addToInventory(userId, entry.recipe.outputItemId, 1, StoragePool.BARN);
    const { level, leveledUp } = await this.economyService.addXp(userId, entry.recipe.outputXpOnCollect);
    await this.prisma.buildingQueueEntry.update({ where: { id: queueEntryId }, data: { collectedAt: new Date() } });
    await this.playerStatsService.recordEvent(userId, 'goodsCrafted');

    return {
      collectedItemTypeId: entry.recipe.outputItemId,
      xpGained: entry.recipe.outputXpOnCollect,
      level,
      leveledUp,
    };
  }
}
