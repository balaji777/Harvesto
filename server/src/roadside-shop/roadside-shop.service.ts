import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { EconomyService } from '../economy/economy.service';
import { ItemCatalogService } from '../catalog/item-catalog.service';
import { MailboxService } from '../mailbox/mailbox.service';
import { GAME_CONFIG } from '../common/constants/game-config';

/**
 * Roadside Shop (GAME_DESIGN.md §6.6) — list owned goods at a bounded price;
 * anyone (mainly neighbors/visitors) can buy while browsing, even while the
 * owner is offline. Goods are reserved out of inventory at listing time, and
 * the seller is paid async via Mailbox on sale.
 */
@Injectable()
export class RoadsideShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly economyService: EconomyService,
    private readonly itemCatalog: ItemCatalogService,
    private readonly mailboxService: MailboxService,
  ) {}

  async listMine(userId: string) {
    return this.prisma.roadsideShopListing.findMany({ where: { userId }, orderBy: { listedAt: 'desc' } });
  }

  async browse(targetUserId: string) {
    return this.prisma.roadsideShopListing.findMany({ where: { userId: targetUserId }, orderBy: { listedAt: 'desc' } });
  }

  async createListing(userId: string, itemTypeId: string, quantity: number, priceCoins: number) {
    if (quantity <= 0) throw new BadRequestException('quantity must be positive');

    const { pool, sellPriceCoins } = await this.itemCatalog.getSellInfo(itemTypeId);
    const minPrice = Math.ceil(sellPriceCoins * GAME_CONFIG.ROADSIDE_SHOP_MIN_PRICE_MULTIPLIER);
    const maxPrice = Math.floor(sellPriceCoins * GAME_CONFIG.ROADSIDE_SHOP_MAX_PRICE_MULTIPLIER);
    if (priceCoins < minPrice || priceCoins > maxPrice) {
      throw new BadRequestException(`Price must be between ${minPrice} and ${maxPrice} coins`);
    }

    // Reserve the goods immediately so they can't also be sold/used elsewhere while listed.
    await this.inventoryService.removeManyFromInventory(userId, [{ itemTypeId, quantity, pool }]);

    return this.prisma.roadsideShopListing.create({ data: { userId, itemTypeId, quantity, priceCoins } });
  }

  async cancelListing(userId: string, listingId: string) {
    const listing = await this.prisma.roadsideShopListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.userId !== userId) throw new NotFoundException('Listing not found');

    const { pool } = await this.itemCatalog.getSellInfo(listing.itemTypeId);
    await this.inventoryService.addToInventory(userId, listing.itemTypeId, listing.quantity, pool);
    await this.prisma.roadsideShopListing.delete({ where: { id: listingId } });
  }

  async buy(buyerUserId: string, listingId: string, quantity: number) {
    if (quantity <= 0) throw new BadRequestException('quantity must be positive');

    const listing = await this.prisma.roadsideShopListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId === buyerUserId) throw new ForbiddenException("Can't buy your own listing");
    if (listing.quantity < quantity) throw new BadRequestException('Not enough stock left');

    const { pool } = await this.itemCatalog.getSellInfo(listing.itemTypeId);
    const totalPrice = listing.priceCoins * quantity;

    await this.economyService.addCoins(buyerUserId, -totalPrice, 'roadside_shop_buy');
    await this.inventoryService.addToInventory(buyerUserId, listing.itemTypeId, quantity, pool);

    if (listing.quantity === quantity) {
      await this.prisma.roadsideShopListing.delete({ where: { id: listingId } });
    } else {
      await this.prisma.roadsideShopListing.update({ where: { id: listingId }, data: { quantity: { decrement: quantity } } });
    }

    // Seller is paid async — they may be offline.
    await this.mailboxService.grant(listing.userId, `Roadside Shop: sold ${quantity}x for ${totalPrice} coins`, {
      coins: totalPrice,
    });

    return { totalPrice };
  }
}
