import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IapStore } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';

/**
 * IAP (GAME_DESIGN.md §6.18/§10.2) — sandbox-mode scaffolding. This
 * environment has no real Google Play Developer API / App Store Server API
 * credentials, so GOOGLE/APPLE receipts are rejected outright rather than
 * silently trusted; SANDBOX receipts (dev/test builds only) are trusted
 * as-is. See server/README.md for exactly what wiring real validation needs.
 */
@Injectable()
export class IapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
  ) {}

  async listProducts() {
    return this.prisma.iapProduct.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async submitReceipt(userId: string, store: IapStore, productId: string, receiptToken: string) {
    const product = await this.prisma.iapProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Unknown product "${productId}"`);

    const existing = await this.prisma.iapReceipt.findUnique({
      where: { store_receiptToken: { store, receiptToken } },
    });
    if (existing) throw new ConflictException('Receipt already processed');

    const verified = this.verify(store, receiptToken);
    const receipt = await this.prisma.iapReceipt.create({
      data: { userId, store, productId, receiptToken, verifiedAt: verified ? new Date() : null, granted: verified },
    });

    if (verified) {
      await this.economyService.addDiamonds(userId, product.diamondAmount, 'iap');
    }

    return { granted: verified, diamondAmount: verified ? product.diamondAmount : 0, receiptId: receipt.id };
  }

  private verify(store: IapStore, receiptToken: string): boolean {
    if (store === IapStore.SANDBOX) return receiptToken.length > 0;
    throw new BadRequestException(
      `${store} receipt validation isn't configured in this environment (needs real Google Play/Apple credentials) — see server/README.md`,
    );
  }
}
