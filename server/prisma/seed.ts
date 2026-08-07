import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Pacing mirrors GAME_DESIGN.md §6.2. xpOnHarvest scales with grow time so
// slower crops remain worth queuing even once faster crops are unlocked.
const CROP_TYPES = [
  { id: 'wheat', name: 'Wheat', unlockLevel: 1, growTimeSeconds: 20, seedCostCoins: 1, sellPriceCoins: 2, xpOnHarvest: 1, sortOrder: 1 },
  { id: 'corn', name: 'Corn', unlockLevel: 2, growTimeSeconds: 180, seedCostCoins: 2, sellPriceCoins: 4, xpOnHarvest: 2, sortOrder: 2 },
  { id: 'soybean', name: 'Soybean', unlockLevel: 4, growTimeSeconds: 1200, seedCostCoins: 4, sellPriceCoins: 8, xpOnHarvest: 4, sortOrder: 3 },
  { id: 'carrot', name: 'Carrot', unlockLevel: 6, growTimeSeconds: 2400, seedCostCoins: 6, sellPriceCoins: 12, xpOnHarvest: 6, sortOrder: 4 },
  { id: 'indigo', name: 'Indigo', unlockLevel: 9, growTimeSeconds: 7200, seedCostCoins: 11, sellPriceCoins: 22, xpOnHarvest: 10, sortOrder: 5 },
  { id: 'sugarcane', name: 'Sugarcane', unlockLevel: 12, growTimeSeconds: 14400, seedCostCoins: 16, sellPriceCoins: 32, xpOnHarvest: 15, sortOrder: 6 },
  { id: 'cotton', name: 'Cotton', unlockLevel: 15, growTimeSeconds: 21600, seedCostCoins: 22, sellPriceCoins: 45, xpOnHarvest: 20, sortOrder: 7 },
];

// Phase 2 (GAME_DESIGN.md §6.3/§6.4). BuildingType must seed before
// AnimalType/Recipe since both carry a foreign key to it.
const BUILDING_TYPES = [
  { id: 'coop', name: 'Coop', category: 'PEN' as const, unlockLevel: 3, purchaseCostCoins: 200, capacity: 4, sortOrder: 1 },
  { id: 'cow_pen', name: 'Cow Pen', category: 'PEN' as const, unlockLevel: 7, purchaseCostCoins: 500, capacity: 3, sortOrder: 2 },
  { id: 'sheep_pen', name: 'Sheep Pen', category: 'PEN' as const, unlockLevel: 10, purchaseCostCoins: 700, capacity: 3, sortOrder: 3 },
  { id: 'bakery', name: 'Bakery', category: 'FACTORY' as const, unlockLevel: 5, purchaseCostCoins: 300, capacity: 1, sortOrder: 4 },
  { id: 'dairy', name: 'Dairy', category: 'FACTORY' as const, unlockLevel: 8, purchaseCostCoins: 600, capacity: 1, sortOrder: 5 },
];

const ANIMAL_TYPES = [
  {
    id: 'chicken', name: 'Chicken', unlockLevel: 3, purchaseCostCoins: 30, penBuildingTypeId: 'coop',
    feedItemId: 'wheat', feedAmount: 1, productionTimeSeconds: 600,
    productItemId: 'egg', productName: 'Egg', productSellPriceCoins: 3, productXpOnCollect: 2, sortOrder: 1,
  },
  {
    id: 'cow', name: 'Cow', unlockLevel: 7, purchaseCostCoins: 100, penBuildingTypeId: 'cow_pen',
    feedItemId: 'corn', feedAmount: 2, productionTimeSeconds: 1800,
    productItemId: 'milk', productName: 'Milk', productSellPriceCoins: 6, productXpOnCollect: 5, sortOrder: 2,
  },
  {
    id: 'sheep', name: 'Sheep', unlockLevel: 10, purchaseCostCoins: 150, penBuildingTypeId: 'sheep_pen',
    feedItemId: 'soybean', feedAmount: 2, productionTimeSeconds: 3600,
    productItemId: 'wool', productName: 'Wool', productSellPriceCoins: 10, productXpOnCollect: 8, sortOrder: 3,
  },
];

const RECIPES = [
  {
    id: 'bread', buildingTypeId: 'bakery', name: 'Bread', unlockLevel: 5, craftTimeSeconds: 300,
    outputItemId: 'bread', outputSellPriceCoins: 15, outputXpOnCollect: 6, sortOrder: 1,
    ingredients: [{ itemTypeId: 'wheat', quantity: 2 }],
  },
  {
    id: 'cake', buildingTypeId: 'bakery', name: 'Cake', unlockLevel: 11, craftTimeSeconds: 1800,
    outputItemId: 'cake', outputSellPriceCoins: 40, outputXpOnCollect: 15, sortOrder: 2,
    ingredients: [
      { itemTypeId: 'wheat', quantity: 2 },
      { itemTypeId: 'egg', quantity: 2 },
      { itemTypeId: 'milk', quantity: 1 },
    ],
  },
  {
    id: 'butter', buildingTypeId: 'dairy', name: 'Butter', unlockLevel: 9, craftTimeSeconds: 600,
    outputItemId: 'butter', outputSellPriceCoins: 18, outputXpOnCollect: 7, sortOrder: 3,
    ingredients: [{ itemTypeId: 'milk', quantity: 1 }],
  },
  {
    id: 'cheese', buildingTypeId: 'dairy', name: 'Cheese', unlockLevel: 8, craftTimeSeconds: 900,
    outputItemId: 'cheese', outputSellPriceCoins: 25, outputXpOnCollect: 10, sortOrder: 4,
    ingredients: [{ itemTypeId: 'milk', quantity: 2 }],
  },
];

// Phase 2 (GAME_DESIGN.md §6.9). statKey names a PlayerStats field.
const ACHIEVEMENTS = [
  { id: 'farming_bronze', category: 'FARMING' as const, tier: 'BRONZE' as const, name: 'First Harvest', description: 'Harvest 10 crops', statKey: 'cropsHarvested', targetValue: 10, rewardCoins: 20, rewardDiamonds: 0, rewardXp: 5, sortOrder: 1 },
  { id: 'farming_silver', category: 'FARMING' as const, tier: 'SILVER' as const, name: 'Green Thumb', description: 'Harvest 100 crops', statKey: 'cropsHarvested', targetValue: 100, rewardCoins: 100, rewardDiamonds: 5, rewardXp: 20, sortOrder: 2 },
  { id: 'farming_gold', category: 'FARMING' as const, tier: 'GOLD' as const, name: 'Master Farmer', description: 'Harvest 500 crops', statKey: 'cropsHarvested', targetValue: 500, rewardCoins: 500, rewardDiamonds: 15, rewardXp: 50, sortOrder: 3 },
  { id: 'livestock_bronze', category: 'LIVESTOCK' as const, tier: 'BRONZE' as const, name: 'Animal Friend', description: 'Collect 5 animal products', statKey: 'animalsCollected', targetValue: 5, rewardCoins: 25, rewardDiamonds: 0, rewardXp: 8, sortOrder: 1 },
  { id: 'livestock_silver', category: 'LIVESTOCK' as const, tier: 'SILVER' as const, name: 'Rancher', description: 'Collect 50 animal products', statKey: 'animalsCollected', targetValue: 50, rewardCoins: 150, rewardDiamonds: 8, rewardXp: 25, sortOrder: 2 },
  { id: 'livestock_gold', category: 'LIVESTOCK' as const, tier: 'GOLD' as const, name: 'Livestock Baron', description: 'Collect 200 animal products', statKey: 'animalsCollected', targetValue: 200, rewardCoins: 600, rewardDiamonds: 20, rewardXp: 60, sortOrder: 3 },
  { id: 'production_bronze', category: 'PRODUCTION' as const, tier: 'BRONZE' as const, name: 'Home Cook', description: 'Craft 5 goods', statKey: 'goodsCrafted', targetValue: 5, rewardCoins: 30, rewardDiamonds: 0, rewardXp: 10, sortOrder: 1 },
  { id: 'production_silver', category: 'PRODUCTION' as const, tier: 'SILVER' as const, name: 'Artisan', description: 'Craft 50 goods', statKey: 'goodsCrafted', targetValue: 50, rewardCoins: 175, rewardDiamonds: 10, rewardXp: 30, sortOrder: 2 },
  { id: 'production_gold', category: 'PRODUCTION' as const, tier: 'GOLD' as const, name: 'Factory Owner', description: 'Craft 200 goods', statKey: 'goodsCrafted', targetValue: 200, rewardCoins: 700, rewardDiamonds: 25, rewardXp: 75, sortOrder: 3 },
  { id: 'trading_bronze', category: 'TRADING' as const, tier: 'BRONZE' as const, name: 'First Delivery', description: 'Fulfill 3 truck orders', statKey: 'ordersFulfilled', targetValue: 3, rewardCoins: 40, rewardDiamonds: 0, rewardXp: 10, sortOrder: 1 },
  { id: 'trading_silver', category: 'TRADING' as const, tier: 'SILVER' as const, name: 'Reliable Trader', description: 'Fulfill 25 truck orders', statKey: 'ordersFulfilled', targetValue: 25, rewardCoins: 200, rewardDiamonds: 12, rewardXp: 35, sortOrder: 2 },
  { id: 'trading_gold', category: 'TRADING' as const, tier: 'GOLD' as const, name: 'Trade Tycoon', description: 'Fulfill 100 truck orders', statKey: 'ordersFulfilled', targetValue: 100, rewardCoins: 800, rewardDiamonds: 30, rewardXp: 80, sortOrder: 3 },
];

// Phase 2 (GAME_DESIGN.md §6.10). DailyMissionService picks 3 of these per UTC day.
const DAILY_MISSIONS = [
  { id: 'daily_harvest', statKey: 'cropsHarvested', targetValue: 10, rewardCoins: 15, rewardXp: 5, description: 'Harvest 10 crops', sortOrder: 1 },
  { id: 'daily_collect', statKey: 'animalsCollected', targetValue: 3, rewardCoins: 20, rewardXp: 8, description: 'Collect 3 animal products', sortOrder: 2 },
  { id: 'daily_craft', statKey: 'goodsCrafted', targetValue: 2, rewardCoins: 25, rewardXp: 10, description: 'Craft 2 goods', sortOrder: 3 },
  { id: 'daily_deliver', statKey: 'ordersFulfilled', targetValue: 1, rewardCoins: 30, rewardXp: 10, description: 'Fulfill 1 truck order', sortOrder: 4 },
];

async function main() {
  for (const crop of CROP_TYPES) {
    await prisma.cropType.upsert({ where: { id: crop.id }, update: crop, create: crop });
  }
  console.log(`Seeded ${CROP_TYPES.length} crop types.`);

  for (const buildingType of BUILDING_TYPES) {
    await prisma.buildingType.upsert({ where: { id: buildingType.id }, update: buildingType, create: buildingType });
  }
  console.log(`Seeded ${BUILDING_TYPES.length} building types.`);

  for (const animalType of ANIMAL_TYPES) {
    await prisma.animalType.upsert({ where: { id: animalType.id }, update: animalType, create: animalType });
  }
  console.log(`Seeded ${ANIMAL_TYPES.length} animal types.`);

  for (const { ingredients, ...recipe } of RECIPES) {
    await prisma.recipe.upsert({ where: { id: recipe.id }, update: recipe, create: recipe });
    for (const ingredient of ingredients) {
      const id = `${recipe.id}_${ingredient.itemTypeId}`;
      await prisma.recipeIngredient.upsert({
        where: { id },
        update: { ...ingredient, recipeId: recipe.id },
        create: { id, recipeId: recipe.id, ...ingredient },
      });
    }
  }
  console.log(`Seeded ${RECIPES.length} recipes.`);

  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievementDefinition.upsert({ where: { id: achievement.id }, update: achievement, create: achievement });
  }
  console.log(`Seeded ${ACHIEVEMENTS.length} achievements.`);

  for (const mission of DAILY_MISSIONS) {
    await prisma.dailyMissionDefinition.upsert({ where: { id: mission.id }, update: mission, create: mission });
  }
  console.log(`Seeded ${DAILY_MISSIONS.length} daily mission definitions.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
