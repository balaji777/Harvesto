-- CreateEnum
CREATE TYPE "BuildingCategory" AS ENUM ('PEN', 'FACTORY');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('TRUCK');

-- CreateTable
CREATE TABLE "AnimalType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unlockLevel" INTEGER NOT NULL,
    "purchaseCostCoins" INTEGER NOT NULL,
    "penBuildingTypeId" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "feedAmount" INTEGER NOT NULL DEFAULT 1,
    "productionTimeSeconds" INTEGER NOT NULL,
    "productItemId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSellPriceCoins" INTEGER NOT NULL,
    "productXpOnCollect" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnimalType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "BuildingCategory" NOT NULL,
    "unlockLevel" INTEGER NOT NULL,
    "purchaseCostCoins" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BuildingType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildingTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "animalTypeId" TEXT NOT NULL,
    "boughtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fedAt" TIMESTAMP(3),
    "productReadyAt" TIMESTAMP(3),

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "buildingTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unlockLevel" INTEGER NOT NULL,
    "craftTimeSeconds" INTEGER NOT NULL,
    "outputItemId" TEXT NOT NULL,
    "outputSellPriceCoins" INTEGER NOT NULL,
    "outputXpOnCollect" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingQueueEntry" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3) NOT NULL,
    "collectedAt" TIMESTAMP(3),

    CONSTRAINT "BuildingQueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "OrderSource" NOT NULL DEFAULT 'TRUCK',
    "requirements" JSONB NOT NULL,
    "rewardCoins" INTEGER NOT NULL,
    "rewardXp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Building_userId_idx" ON "Building"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_userId_buildingTypeId_key" ON "Building"("userId", "buildingTypeId");

-- CreateIndex
CREATE INDEX "Animal_userId_idx" ON "Animal"("userId");

-- CreateIndex
CREATE INDEX "Animal_buildingId_idx" ON "Animal"("buildingId");

-- CreateIndex
CREATE INDEX "BuildingQueueEntry_buildingId_idx" ON "BuildingQueueEntry"("buildingId");

-- CreateIndex
CREATE INDEX "Order_userId_source_fulfilledAt_idx" ON "Order"("userId", "source", "fulfilledAt");

-- AddForeignKey
ALTER TABLE "AnimalType" ADD CONSTRAINT "AnimalType_penBuildingTypeId_fkey" FOREIGN KEY ("penBuildingTypeId") REFERENCES "BuildingType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_buildingTypeId_fkey" FOREIGN KEY ("buildingTypeId") REFERENCES "BuildingType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_animalTypeId_fkey" FOREIGN KEY ("animalTypeId") REFERENCES "AnimalType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_buildingTypeId_fkey" FOREIGN KEY ("buildingTypeId") REFERENCES "BuildingType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingQueueEntry" ADD CONSTRAINT "BuildingQueueEntry_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingQueueEntry" ADD CONSTRAINT "BuildingQueueEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
