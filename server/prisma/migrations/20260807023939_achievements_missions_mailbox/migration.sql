-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('FARMING', 'LIVESTOCK', 'PRODUCTION', 'TRADING');

-- CreateEnum
CREATE TYPE "AchievementTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'STAR');

-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN     "lastLoginRewardAt" TIMESTAMPTZ(3),
ADD COLUMN     "loginStreak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PlayerStats" (
    "userId" TEXT NOT NULL,
    "cropsHarvested" INTEGER NOT NULL DEFAULT 0,
    "animalsCollected" INTEGER NOT NULL DEFAULT 0,
    "goodsCrafted" INTEGER NOT NULL DEFAULT 0,
    "ordersFulfilled" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AchievementDefinition" (
    "id" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "tier" "AchievementTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "statKey" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardDiamonds" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AchievementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementDefinitionId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMissionDefinition" (
    "id" TEXT NOT NULL,
    "statKey" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyMissionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMissionAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionDefinitionId" TEXT NOT NULL,
    "assignedDate" TIMESTAMPTZ(3) NOT NULL,
    "statValueAtAssignment" INTEGER NOT NULL,
    "claimedAt" TIMESTAMPTZ(3),

    CONSTRAINT "DailyMissionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardDiamonds" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMPTZ(3),

    CONSTRAINT "MailItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerAchievement_userId_idx" ON "PlayerAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_userId_achievementDefinitionId_key" ON "PlayerAchievement"("userId", "achievementDefinitionId");

-- CreateIndex
CREATE INDEX "DailyMissionAssignment_userId_assignedDate_idx" ON "DailyMissionAssignment"("userId", "assignedDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMissionAssignment_userId_missionDefinitionId_assignedD_key" ON "DailyMissionAssignment"("userId", "missionDefinitionId", "assignedDate");

-- CreateIndex
CREATE INDEX "MailItem_userId_claimedAt_idx" ON "MailItem"("userId", "claimedAt");

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_achievementDefinitionId_fkey" FOREIGN KEY ("achievementDefinitionId") REFERENCES "AchievementDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMissionAssignment" ADD CONSTRAINT "DailyMissionAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMissionAssignment" ADD CONSTRAINT "DailyMissionAssignment_missionDefinitionId_fkey" FOREIGN KEY ("missionDefinitionId") REFERENCES "DailyMissionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailItem" ADD CONSTRAINT "MailItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
