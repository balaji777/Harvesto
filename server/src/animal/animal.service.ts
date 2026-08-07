import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { StoragePool } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { InventoryService } from '../inventory/inventory.service';
import { PlayerStatsService } from '../progression/player-stats.service';

@Injectable()
export class AnimalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
    private readonly inventoryService: InventoryService,
    private readonly playerStatsService: PlayerStatsService,
  ) {}

  async listAnimalTypes() {
    return this.prisma.animalType.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async listMyAnimals(userId: string) {
    return this.prisma.animal.findMany({
      where: { userId },
      include: { animalType: true },
      orderBy: { boughtAt: 'asc' },
    });
  }

  async buy(userId: string, animalTypeId: string, buildingId: string) {
    const [profile, animalType, building] = await Promise.all([
      this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } }),
      this.prisma.animalType.findUnique({ where: { id: animalTypeId } }),
      this.prisma.building.findUnique({ where: { id: buildingId }, include: { buildingType: true } }),
    ]);
    if (!animalType) throw new NotFoundException(`Unknown animal type "${animalTypeId}"`);
    if (animalType.unlockLevel > profile.level) {
      throw new ForbiddenException(`${animalType.name} unlocks at level ${animalType.unlockLevel}`);
    }
    if (!building || building.userId !== userId) throw new NotFoundException('Building not found');
    if (building.buildingTypeId !== animalType.penBuildingTypeId) {
      throw new BadRequestException(`${animalType.name} doesn't live in ${building.buildingType.name}`);
    }

    const currentCount = await this.prisma.animal.count({ where: { buildingId } });
    if (currentCount >= building.buildingType.capacity) {
      throw new BadRequestException(`${building.buildingType.name} is full`);
    }

    await this.economyService.addCoins(userId, -animalType.purchaseCostCoins, 'animal_purchase');

    return this.prisma.animal.create({
      data: { userId, buildingId, animalTypeId },
      include: { animalType: true },
    });
  }

  async feed(userId: string, animalId: string) {
    const animal = await this.getOwnedAnimal(userId, animalId);
    if (animal.productReadyAt !== null) {
      throw new BadRequestException('This animal already has a product waiting — collect it first');
    }

    await this.inventoryService.removeManyFromInventory(userId, [
      { itemTypeId: animal.animalType.feedItemId, quantity: animal.animalType.feedAmount, pool: StoragePool.SILO },
    ]);

    const now = new Date();
    const productReadyAt = new Date(now.getTime() + animal.animalType.productionTimeSeconds * 1000);
    return this.prisma.animal.update({
      where: { id: animalId },
      data: { fedAt: now, productReadyAt },
      include: { animalType: true },
    });
  }

  async collect(userId: string, animalId: string) {
    const animal = await this.getOwnedAnimal(userId, animalId);
    if (!animal.productReadyAt || animal.productReadyAt > new Date()) {
      throw new BadRequestException('Nothing ready to collect yet');
    }

    // Barn-full check happens inside addToInventory; if it throws, the
    // animal stays in the "ready" state so the player can retry.
    await this.inventoryService.addToInventory(userId, animal.animalType.productItemId, 1, StoragePool.BARN);
    const { level, leveledUp } = await this.economyService.addXp(userId, animal.animalType.productXpOnCollect);
    await this.prisma.animal.update({ where: { id: animalId }, data: { fedAt: null, productReadyAt: null } });
    await this.playerStatsService.recordEvent(userId, 'animalsCollected');

    return {
      collectedItemTypeId: animal.animalType.productItemId,
      xpGained: animal.animalType.productXpOnCollect,
      level,
      leveledUp,
    };
  }

  private async getOwnedAnimal(userId: string, animalId: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { id: animalId },
      include: { animalType: true },
    });
    if (!animal || animal.userId !== userId) throw new NotFoundException('Animal not found');
    return animal;
  }
}
