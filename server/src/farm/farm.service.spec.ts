import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StoragePool, TileType } from '@prisma/client';
import { FarmService } from './farm.service';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { InventoryService } from '../inventory/inventory.service';
import { PlayerStatsService } from '../progression/player-stats.service';

describe('FarmService', () => {
  let farmService: FarmService;
  let prisma: {
    farm: { findUnique: jest.Mock; create: jest.Mock };
    farmTile: { findUnique: jest.Mock; createMany: jest.Mock };
    playerProfile: { findUniqueOrThrow: jest.Mock };
    cropType: { findUnique: jest.Mock };
    plantedCrop: { create: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
  };
  let economyService: { addCoins: jest.Mock; addXp: jest.Mock };
  let inventoryService: { addToInventory: jest.Mock };
  let playerStatsService: { recordEvent: jest.Mock };

  beforeEach(() => {
    prisma = {
      farm: { findUnique: jest.fn(), create: jest.fn() },
      farmTile: { findUnique: jest.fn(), createMany: jest.fn() },
      playerProfile: { findUniqueOrThrow: jest.fn() },
      cropType: { findUnique: jest.fn() },
      plantedCrop: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    };
    economyService = { addCoins: jest.fn(), addXp: jest.fn() };
    inventoryService = { addToInventory: jest.fn() };
    playerStatsService = { recordEvent: jest.fn() };

    farmService = new FarmService(
      prisma as unknown as PrismaService,
      economyService as unknown as EconomyService,
      inventoryService as unknown as InventoryService,
      playerStatsService as unknown as PlayerStatsService,
    );
  });

  describe('plant', () => {
    const userId = 'user-1';
    const cropType = {
      id: 'wheat',
      name: 'Wheat',
      unlockLevel: 1,
      growTimeSeconds: 20,
      seedCostCoins: 1,
      sellPriceCoins: 2,
      xpOnHarvest: 1,
    };

    beforeEach(() => {
      prisma.farm.findUnique.mockResolvedValue({ id: 'farm-1', userId });
      prisma.playerProfile.findUniqueOrThrow.mockResolvedValue({ level: 1, coins: 500 });
      prisma.cropType.findUnique.mockResolvedValue(cropType);
      prisma.farmTile.findUnique.mockResolvedValue({
        id: 'tile-1',
        tileType: TileType.FARMABLE,
        plantedCrop: null,
      });
      prisma.plantedCrop.create.mockResolvedValue({ id: 'pc-1', cropTypeId: 'wheat' });
    });

    it('deducts the seed cost and creates a planted crop on a valid farmable empty tile', async () => {
      await farmService.plant(userId, 5, 5, 'wheat');
      expect(economyService.addCoins).toHaveBeenCalledWith(userId, -1, 'seed_purchase');
      expect(prisma.plantedCrop.create).toHaveBeenCalledTimes(1);
    });

    it('rejects planting on a locked tile', async () => {
      prisma.farmTile.findUnique.mockResolvedValue({ id: 'tile-1', tileType: TileType.LOCKED, plantedCrop: null });
      await expect(farmService.plant(userId, 0, 0, 'wheat')).rejects.toThrow(BadRequestException);
      expect(economyService.addCoins).not.toHaveBeenCalled();
    });

    it('rejects planting on an already-planted tile', async () => {
      prisma.farmTile.findUnique.mockResolvedValue({
        id: 'tile-1',
        tileType: TileType.FARMABLE,
        plantedCrop: { id: 'existing' },
      });
      await expect(farmService.plant(userId, 5, 5, 'wheat')).rejects.toThrow(BadRequestException);
    });

    it('rejects a crop not yet unlocked at the player level', async () => {
      prisma.cropType.findUnique.mockResolvedValue({ ...cropType, id: 'cotton', unlockLevel: 15 });
      await expect(farmService.plant(userId, 5, 5, 'cotton')).rejects.toThrow(ForbiddenException);
    });

    it('propagates insufficient-coins failure from EconomyService without planting', async () => {
      economyService.addCoins.mockRejectedValue(new BadRequestException('Insufficient coins'));
      await expect(farmService.plant(userId, 5, 5, 'wheat')).rejects.toThrow(BadRequestException);
      expect(prisma.plantedCrop.create).not.toHaveBeenCalled();
    });
  });

  describe('harvest', () => {
    const userId = 'user-1';

    it('harvests a ready crop: adds to silo, grants xp, frees the tile', async () => {
      prisma.plantedCrop.findUnique.mockResolvedValue({
        id: 'pc-1',
        cropTypeId: 'wheat',
        readyAt: new Date(Date.now() - 1000),
        cropType: { id: 'wheat', xpOnHarvest: 1 },
        tile: { farm: { userId } },
      });
      economyService.addXp.mockResolvedValue({ level: 1, leveledUp: false });

      const result = await farmService.harvest(userId, 'tile-1');

      expect(inventoryService.addToInventory).toHaveBeenCalledWith(userId, 'wheat', 1, StoragePool.SILO);
      expect(economyService.addXp).toHaveBeenCalledWith(userId, 1);
      expect(prisma.plantedCrop.delete).toHaveBeenCalledWith({ where: { id: 'pc-1' } });
      expect(playerStatsService.recordEvent).toHaveBeenCalledWith(userId, 'cropsHarvested');
      expect(result.harvestedCropTypeId).toBe('wheat');
    });

    it('rejects harvesting a crop that is not ready', async () => {
      prisma.plantedCrop.findUnique.mockResolvedValue({
        id: 'pc-1',
        cropTypeId: 'wheat',
        readyAt: new Date(Date.now() + 60_000),
        cropType: { id: 'wheat', xpOnHarvest: 1 },
        tile: { farm: { userId } },
      });

      await expect(farmService.harvest(userId, 'tile-1')).rejects.toThrow(BadRequestException);
      expect(inventoryService.addToInventory).not.toHaveBeenCalled();
      expect(prisma.plantedCrop.delete).not.toHaveBeenCalled();
    });

    it('rejects harvesting a tile that is not the caller\'s farm', async () => {
      prisma.plantedCrop.findUnique.mockResolvedValue({
        id: 'pc-1',
        cropTypeId: 'wheat',
        readyAt: new Date(Date.now() - 1000),
        cropType: { id: 'wheat', xpOnHarvest: 1 },
        tile: { farm: { userId: 'someone-else' } },
      });

      await expect(farmService.harvest(userId, 'tile-1')).rejects.toThrow(ForbiddenException);
    });

    it('rejects harvesting an empty tile', async () => {
      prisma.plantedCrop.findUnique.mockResolvedValue(null);
      await expect(farmService.harvest(userId, 'tile-1')).rejects.toThrow(NotFoundException);
    });

    it('leaves the crop planted if the silo is full, so the player can retry', async () => {
      prisma.plantedCrop.findUnique.mockResolvedValue({
        id: 'pc-1',
        cropTypeId: 'wheat',
        readyAt: new Date(Date.now() - 1000),
        cropType: { id: 'wheat', xpOnHarvest: 1 },
        tile: { farm: { userId } },
      });
      inventoryService.addToInventory.mockRejectedValue(new BadRequestException('Silo is full'));

      await expect(farmService.harvest(userId, 'tile-1')).rejects.toThrow(BadRequestException);
      expect(prisma.plantedCrop.delete).not.toHaveBeenCalled();
      expect(economyService.addXp).not.toHaveBeenCalled();
      expect(playerStatsService.recordEvent).not.toHaveBeenCalled();
    });
  });
});
