import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';

/**
 * Town system (GAME_DESIGN.md §5/§6.4): staffing a shop costs coins + a wait
 * timer (same shape as FarmService's tile clearing) and unlocks any Recipe
 * that names it via Recipe.requiresTownShopId — see BuildingService.craft.
 */
@Injectable()
export class TownService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
  ) {}

  async listShopTypes() {
    return this.prisma.townShopType.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async listMine(userId: string) {
    return this.prisma.playerTownShop.findMany({ where: { userId }, include: { townShopType: true } });
  }

  /** True once the given shop's staffing has been collected — checked by BuildingService.craft. */
  async isStaffed(userId: string, townShopTypeId: string): Promise<boolean> {
    const shop = await this.prisma.playerTownShop.findUnique({
      where: { userId_townShopTypeId: { userId, townShopTypeId } },
    });
    return !!shop?.staffedAt;
  }

  async startStaffing(userId: string, townShopTypeId: string) {
    const [profile, shopType, existing] = await Promise.all([
      this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } }),
      this.prisma.townShopType.findUnique({ where: { id: townShopTypeId } }),
      this.prisma.playerTownShop.findUnique({ where: { userId_townShopTypeId: { userId, townShopTypeId } } }),
    ]);
    if (!shopType) throw new NotFoundException(`Unknown town shop "${townShopTypeId}"`);
    if (shopType.unlockLevel > profile.level) {
      throw new ForbiddenException(`${shopType.name} unlocks at level ${shopType.unlockLevel}`);
    }
    if (existing) throw new BadRequestException(`You've already started staffing ${shopType.name}`);

    await this.economyService.addCoins(userId, -shopType.staffCostCoins, 'town_shop_staff');

    const readyAt = new Date(Date.now() + shopType.staffTimeSeconds * 1000);
    return this.prisma.playerTownShop.create({
      data: { userId, townShopTypeId, readyAt },
      include: { townShopType: true },
    });
  }

  async collectStaffing(userId: string, townShopTypeId: string) {
    const shop = await this.prisma.playerTownShop.findUnique({
      where: { userId_townShopTypeId: { userId, townShopTypeId } },
      include: { townShopType: true },
    });
    if (!shop) throw new NotFoundException('You have not started staffing this shop');
    if (shop.staffedAt) throw new BadRequestException('Already staffed');
    if (shop.readyAt > new Date()) throw new BadRequestException('Still staffing');

    return this.prisma.playerTownShop.update({
      where: { userId_townShopTypeId: { userId, townShopTypeId } },
      data: { staffedAt: new Date() },
      include: { townShopType: true },
    });
  }
}
