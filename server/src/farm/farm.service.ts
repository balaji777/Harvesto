import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { StoragePool, TileType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { InventoryService } from '../inventory/inventory.service';
import { PlayerStatsService } from '../progression/player-stats.service';
import { GAME_CONFIG } from '../common/constants/game-config';

@Injectable()
export class FarmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
    private readonly inventoryService: InventoryService,
    private readonly playerStatsService: PlayerStatsService,
  ) {}

  /** Creates the starting grid: a farmable square in the middle of a mostly-locked plot. */
  async createFarmForUser(userId: string): Promise<void> {
    const { STARTING_GRID_WIDTH: width, STARTING_GRID_HEIGHT: height, STARTING_FARMABLE_RADIUS: radius } =
      GAME_CONFIG;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    const farm = await this.prisma.farm.create({
      data: { userId, gridWidth: width, gridHeight: height },
    });

    const tiles = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const isFarmable =
          x >= centerX - radius && x < centerX + radius && y >= centerY - radius && y < centerY + radius;
        tiles.push({
          farmId: farm.id,
          x,
          y,
          tileType: isFarmable ? TileType.FARMABLE : TileType.LOCKED,
        });
      }
    }
    await this.prisma.farmTile.createMany({ data: tiles });
  }

  async getFarmState(userId: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { userId },
      include: { tiles: { include: { plantedCrop: { include: { cropType: true } } } } },
    });
    if (!farm) throw new NotFoundException('Farm not found');
    return farm;
  }

  async listCropTypes() {
    return this.prisma.cropType.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async plant(userId: string, x: number, y: number, cropTypeId: string) {
    const [farm, profile, cropType] = await Promise.all([
      this.prisma.farm.findUnique({ where: { userId } }),
      this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } }),
      this.prisma.cropType.findUnique({ where: { id: cropTypeId } }),
    ]);
    if (!farm) throw new NotFoundException('Farm not found');
    if (!cropType) throw new NotFoundException(`Unknown crop type "${cropTypeId}"`);
    if (cropType.unlockLevel > profile.level) {
      throw new ForbiddenException(`${cropType.name} unlocks at level ${cropType.unlockLevel}`);
    }

    const tile = await this.prisma.farmTile.findUnique({
      where: { farmId_x_y: { farmId: farm.id, x, y } },
      include: { plantedCrop: true },
    });
    if (!tile) throw new NotFoundException('Tile out of bounds');
    if (tile.tileType !== TileType.FARMABLE) throw new BadRequestException('Tile is locked');
    if (tile.plantedCrop) throw new BadRequestException('Tile is already planted');

    // Deduct first — throws on insufficient coins, aborting before we touch the tile.
    await this.economyService.addCoins(userId, -cropType.seedCostCoins, 'seed_purchase');

    const readyAt = new Date(Date.now() + cropType.growTimeSeconds * 1000);
    return this.prisma.plantedCrop.create({
      data: { tileId: tile.id, cropTypeId: cropType.id, readyAt },
      include: { cropType: true },
    });
  }

  /** Starts clearing a LOCKED tile — cost/time scale with ring distance from the starting farmable square. */
  async startClearing(userId: string, tileId: string) {
    const tile = await this.prisma.farmTile.findUnique({ where: { id: tileId }, include: { farm: true } });
    if (!tile) throw new NotFoundException('Tile not found');
    if (tile.farm.userId !== userId) throw new ForbiddenException('Not your farm');
    if (tile.tileType !== TileType.LOCKED) throw new BadRequestException('Tile is already clear');
    if (tile.clearingReadyAt) throw new BadRequestException('Already clearing this tile');

    const ring = this.ringDistance(tile.x, tile.y);
    const cost = GAME_CONFIG.TILE_CLEAR_BASE_COST_COINS + ring * GAME_CONFIG.TILE_CLEAR_COST_PER_RING;
    const timeSeconds = GAME_CONFIG.TILE_CLEAR_BASE_TIME_SECONDS + ring * GAME_CONFIG.TILE_CLEAR_TIME_PER_RING_SECONDS;

    // Deduct first — throws on insufficient coins, aborting before we touch the tile.
    await this.economyService.addCoins(userId, -cost, 'tile_clear');

    const readyAt = new Date(Date.now() + timeSeconds * 1000);
    return this.prisma.farmTile.update({
      where: { id: tileId },
      data: { clearingStartedAt: new Date(), clearingReadyAt: readyAt },
    });
  }

  async collectClearing(userId: string, tileId: string) {
    const tile = await this.prisma.farmTile.findUnique({ where: { id: tileId }, include: { farm: true } });
    if (!tile) throw new NotFoundException('Tile not found');
    if (tile.farm.userId !== userId) throw new ForbiddenException('Not your farm');
    if (!tile.clearingReadyAt) throw new BadRequestException('This tile is not being cleared');
    if (tile.clearingReadyAt > new Date()) throw new BadRequestException('Still clearing');

    return this.prisma.farmTile.update({
      where: { id: tileId },
      data: { tileType: TileType.FARMABLE, clearingStartedAt: null, clearingReadyAt: null },
    });
  }

  /** Chebyshev distance in "rings" outward from the edge of the starting farmable square — 0 for tiles already inside it. */
  private ringDistance(x: number, y: number): number {
    const { STARTING_GRID_WIDTH: width, STARTING_GRID_HEIGHT: height, STARTING_FARMABLE_RADIUS: radius } = GAME_CONFIG;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const dist = Math.max(Math.abs(x - centerX), Math.abs(y - centerY));
    return Math.max(0, dist - radius + 1);
  }

  async harvest(userId: string, tileId: string) {
    const plantedCrop = await this.prisma.plantedCrop.findUnique({
      where: { tileId },
      include: { cropType: true, tile: { include: { farm: true } } },
    });
    if (!plantedCrop) throw new NotFoundException('Nothing planted on this tile');
    if (plantedCrop.tile.farm.userId !== userId) throw new ForbiddenException('Not your farm');
    if (plantedCrop.readyAt > new Date()) {
      throw new BadRequestException('Crop is not ready yet');
    }

    // Silo-full check happens inside addToInventory; if it throws, the crop
    // stays planted so the player can sell space and retry the harvest.
    await this.inventoryService.addToInventory(userId, plantedCrop.cropTypeId, 1, StoragePool.SILO);
    const { level, leveledUp } = await this.economyService.addXp(userId, plantedCrop.cropType.xpOnHarvest);
    await this.prisma.plantedCrop.delete({ where: { id: plantedCrop.id } });
    await this.playerStatsService.recordEvent(userId, 'cropsHarvested');

    return {
      harvestedCropTypeId: plantedCrop.cropTypeId,
      xpGained: plantedCrop.cropType.xpOnHarvest,
      level,
      leveledUp,
    };
  }
}
