import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';

@Injectable()
export class DecorationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
  ) {}

  async listTypes() {
    return this.prisma.decorationType.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async listMine(userId: string) {
    return this.prisma.playerDecoration.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { decorationType: true },
    });
  }

  async buy(userId: string, decorationTypeId: string, quantity: number) {
    const [profile, decorationType] = await Promise.all([
      this.prisma.playerProfile.findUniqueOrThrow({ where: { userId } }),
      this.prisma.decorationType.findUnique({ where: { id: decorationTypeId } }),
    ]);
    if (!decorationType) throw new NotFoundException(`Unknown decoration "${decorationTypeId}"`);
    if (decorationType.unlockLevel > profile.level) {
      throw new ForbiddenException(`${decorationType.name} unlocks at level ${decorationType.unlockLevel}`);
    }

    await this.economyService.addCoins(userId, -decorationType.purchaseCostCoins * quantity, 'decoration_purchase');

    return this.prisma.playerDecoration.upsert({
      where: { userId_decorationTypeId: { userId, decorationTypeId } },
      update: { quantity: { increment: quantity } },
      create: { userId, decorationTypeId, quantity },
      include: { decorationType: true },
    });
  }

  /** Simple cosmetic flex stat: sum of (owned quantity x that decoration's bonus) — see GAME_DESIGN.md §12 Phase 4. */
  async getFarmValue(userId: string): Promise<{ farmValue: number }> {
    const owned = await this.prisma.playerDecoration.findMany({
      where: { userId },
      include: { decorationType: true },
    });
    const farmValue = owned.reduce((sum, item) => sum + item.quantity * item.decorationType.farmValueBonus, 0);
    return { farmValue };
  }
}
