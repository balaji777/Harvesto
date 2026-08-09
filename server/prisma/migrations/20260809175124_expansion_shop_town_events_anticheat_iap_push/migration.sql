-- CreateEnum
CREATE TYPE "IapStore" AS ENUM ('GOOGLE', 'APPLE', 'SANDBOX');

-- CreateEnum
CREATE TYPE "PushPlatform" AS ENUM ('IOS', 'ANDROID');

-- AlterTable
ALTER TABLE "FarmTile" ADD COLUMN     "clearingReadyAt" TIMESTAMPTZ(3),
ADD COLUMN     "clearingStartedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "requiresTownShopId" TEXT;

-- CreateTable
CREATE TABLE "RoadsideShopListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceCoins" INTEGER NOT NULL,
    "listedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadsideShopListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TownShopType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unlockLevel" INTEGER NOT NULL,
    "staffCostCoins" INTEGER NOT NULL,
    "staffTimeSeconds" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TownShopType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerTownShop" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "townShopTypeId" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMPTZ(3) NOT NULL,
    "staffedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PlayerTownShop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "currencyName" TEXT NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRewardTier" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tierIndex" INTEGER NOT NULL,
    "thresholdCurrency" INTEGER NOT NULL,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardDiamonds" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventRewardTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "currencyEarned" INTEGER NOT NULL DEFAULT 0,
    "claimedTierIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EventProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PlayerFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IapProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diamondAmount" INTEGER NOT NULL,
    "priceUsdCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IapProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IapReceipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "store" "IapStore" NOT NULL,
    "productId" TEXT NOT NULL,
    "receiptToken" TEXT NOT NULL,
    "verifiedAt" TIMESTAMPTZ(3),
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IapReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "PushPlatform" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoadsideShopListing_userId_idx" ON "RoadsideShopListing"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerTownShop_userId_townShopTypeId_key" ON "PlayerTownShop"("userId", "townShopTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRewardTier_eventId_tierIndex_key" ON "EventRewardTier"("eventId", "tierIndex");

-- CreateIndex
CREATE UNIQUE INDEX "EventProgress_userId_eventId_key" ON "EventProgress"("userId", "eventId");

-- CreateIndex
CREATE INDEX "PlayerFlag_userId_resolvedAt_idx" ON "PlayerFlag"("userId", "resolvedAt");

-- CreateIndex
CREATE INDEX "IapReceipt_userId_idx" ON "IapReceipt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IapReceipt_store_receiptToken_key" ON "IapReceipt"("store", "receiptToken");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_userId_token_key" ON "PushToken"("userId", "token");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_requiresTownShopId_fkey" FOREIGN KEY ("requiresTownShopId") REFERENCES "TownShopType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadsideShopListing" ADD CONSTRAINT "RoadsideShopListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTownShop" ADD CONSTRAINT "PlayerTownShop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTownShop" ADD CONSTRAINT "PlayerTownShop_townShopTypeId_fkey" FOREIGN KEY ("townShopTypeId") REFERENCES "TownShopType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRewardTier" ADD CONSTRAINT "EventRewardTier_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SeasonalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProgress" ADD CONSTRAINT "EventProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProgress" ADD CONSTRAINT "EventProgress_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SeasonalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerFlag" ADD CONSTRAINT "PlayerFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IapReceipt" ADD CONSTRAINT "IapReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
