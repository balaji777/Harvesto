import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';

@Injectable()
export class CosmeticService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
  ) {}

  async listTypes() {
    return this.prisma.cosmeticType.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
  }

  async listMine(userId: string) {
    const [owned, equipped] = await Promise.all([
      this.prisma.playerCosmetic.findMany({ where: { userId }, include: { cosmeticType: true } }),
      this.prisma.playerEquippedCosmetic.findMany({ where: { userId }, include: { cosmeticType: true } }),
    ]);
    return { owned, equipped };
  }

  async buy(userId: string, cosmeticTypeId: string) {
    const [profile, cosmeticType, existing] = await Promise.all([
      this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } }),
      this.prisma.cosmeticType.findUnique({ where: { id: cosmeticTypeId } }),
      this.prisma.playerCosmetic.findUnique({ where: { userId_cosmeticTypeId: { userId, cosmeticTypeId } } }),
    ]);
    if (!cosmeticType) throw new NotFoundException(`Unknown cosmetic "${cosmeticTypeId}"`);
    if (cosmeticType.unlockLevel > profile.level) {
      throw new ForbiddenException(`${cosmeticType.name} unlocks at level ${cosmeticType.unlockLevel}`);
    }
    if (existing) throw new BadRequestException(`You already own ${cosmeticType.name}`);

    if (cosmeticType.purchaseCostCoins > 0) {
      await this.economyService.addCoins(userId, -cosmeticType.purchaseCostCoins, 'cosmetic_purchase');
    }
    return this.prisma.playerCosmetic.create({ data: { userId, cosmeticTypeId }, include: { cosmeticType: true } });
  }

  async equip(userId: string, cosmeticTypeId: string) {
    const owned = await this.prisma.playerCosmetic.findUnique({
      where: { userId_cosmeticTypeId: { userId, cosmeticTypeId } },
      include: { cosmeticType: true },
    });
    if (!owned) throw new BadRequestException("You don't own that cosmetic yet");

    return this.prisma.playerEquippedCosmetic.upsert({
      where: { userId_category: { userId, category: owned.cosmeticType.category } },
      update: { cosmeticTypeId, equippedAt: new Date() },
      create: { userId, category: owned.cosmeticType.category, cosmeticTypeId },
      include: { cosmeticType: true },
    });
  }
}
