-- AlterEnum
ALTER TYPE "AchievementCategory" ADD VALUE 'FISHING';

-- AlterEnum
ALTER TYPE "OrderSource" ADD VALUE 'TRAIN';

-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN     "fishingCastReadyAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "PlayerStats" ADD COLUMN     "fishCaught" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FishType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unlockLevel" INTEGER NOT NULL,
    "sellPriceCoins" INTEGER NOT NULL,
    "xpOnCatch" INTEGER NOT NULL,
    "rarityWeight" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FishType_pkey" PRIMARY KEY ("id")
);
