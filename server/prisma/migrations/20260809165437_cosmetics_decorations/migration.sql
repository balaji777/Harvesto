-- CreateEnum
CREATE TYPE "CosmeticCategory" AS ENUM ('SKIN_TONE', 'HAIR', 'OUTFIT', 'HAT', 'ACCESSORY');

-- CreateTable
CREATE TABLE "CosmeticType" (
    "id" TEXT NOT NULL,
    "category" "CosmeticCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "unlockLevel" INTEGER NOT NULL,
    "purchaseCostCoins" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CosmeticType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerCosmetic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cosmeticTypeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerCosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerEquippedCosmetic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "CosmeticCategory" NOT NULL,
    "cosmeticTypeId" TEXT NOT NULL,
    "equippedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerEquippedCosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecorationType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unlockLevel" INTEGER NOT NULL,
    "purchaseCostCoins" INTEGER NOT NULL,
    "farmValueBonus" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DecorationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerDecoration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decorationTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PlayerDecoration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCosmetic_userId_cosmeticTypeId_key" ON "PlayerCosmetic"("userId", "cosmeticTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerEquippedCosmetic_userId_category_key" ON "PlayerEquippedCosmetic"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerDecoration_userId_decorationTypeId_key" ON "PlayerDecoration"("userId", "decorationTypeId");

-- AddForeignKey
ALTER TABLE "PlayerCosmetic" ADD CONSTRAINT "PlayerCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCosmetic" ADD CONSTRAINT "PlayerCosmetic_cosmeticTypeId_fkey" FOREIGN KEY ("cosmeticTypeId") REFERENCES "CosmeticType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEquippedCosmetic" ADD CONSTRAINT "PlayerEquippedCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEquippedCosmetic" ADD CONSTRAINT "PlayerEquippedCosmetic_cosmeticTypeId_fkey" FOREIGN KEY ("cosmeticTypeId") REFERENCES "CosmeticType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerDecoration" ADD CONSTRAINT "PlayerDecoration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerDecoration" ADD CONSTRAINT "PlayerDecoration_decorationTypeId_fkey" FOREIGN KEY ("decorationTypeId") REFERENCES "DecorationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
