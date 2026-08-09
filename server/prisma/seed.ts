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

// Town system (GAME_DESIGN.md §5/§6.4). Must seed before RECIPES since some
// recipes gate on one of these via requiresTownShopId.
const TOWN_SHOP_TYPES = [
  { id: 'bakery_stand', name: 'Bakery Stand', unlockLevel: 5, staffCostCoins: 250, staffTimeSeconds: 60, sortOrder: 1 },
  { id: 'dairy_stand', name: 'Dairy Stand', unlockLevel: 8, staffCostCoins: 400, staffTimeSeconds: 90, sortOrder: 2 },
  { id: 'fabric_store', name: 'Fabric Store', unlockLevel: 15, staffCostCoins: 800, staffTimeSeconds: 180, sortOrder: 3 },
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
  // Town-gated example (GAME_DESIGN.md §6.4): needs level 6 *and* the Bakery
  // Stand staffed — see TownService.isStaffed / BuildingService.craft.
  {
    id: 'pie', buildingTypeId: 'bakery', name: 'Pie', unlockLevel: 6, craftTimeSeconds: 900,
    outputItemId: 'pie', outputSellPriceCoins: 28, outputXpOnCollect: 12, sortOrder: 5,
    requiresTownShopId: 'bakery_stand',
    ingredients: [
      { itemTypeId: 'wheat', quantity: 3 },
      { itemTypeId: 'carrot', quantity: 2 },
    ],
  },
];

// Phase 4 fishing lake. rarityWeight feeds a weighted-random pick — see FishingService.
const FISH_TYPES = [
  { id: 'minnow', name: 'Minnow', unlockLevel: 1, sellPriceCoins: 3, xpOnCatch: 1, rarityWeight: 100, sortOrder: 1 },
  { id: 'perch', name: 'Perch', unlockLevel: 1, sellPriceCoins: 5, xpOnCatch: 2, rarityWeight: 60, sortOrder: 2 },
  { id: 'bass', name: 'Bass', unlockLevel: 4, sellPriceCoins: 10, xpOnCatch: 4, rarityWeight: 30, sortOrder: 3 },
  { id: 'trout', name: 'Trout', unlockLevel: 4, sellPriceCoins: 12, xpOnCatch: 5, rarityWeight: 25, sortOrder: 4 },
  { id: 'catfish', name: 'Catfish', unlockLevel: 8, sellPriceCoins: 20, xpOnCatch: 8, rarityWeight: 12, sortOrder: 5 },
  { id: 'golden_koi', name: 'Golden Koi', unlockLevel: 12, sellPriceCoins: 60, xpOnCatch: 20, rarityWeight: 3, sortOrder: 6 },
];

// Phase 4 character customization. Free (0-cost) entries are the starter
// options every new player can equip immediately.
const COSMETIC_TYPES = [
  { id: 'skin_light', category: 'SKIN_TONE' as const, name: 'Light Skin', unlockLevel: 1, purchaseCostCoins: 0, sortOrder: 1 },
  { id: 'skin_medium', category: 'SKIN_TONE' as const, name: 'Medium Skin', unlockLevel: 1, purchaseCostCoins: 0, sortOrder: 2 },
  { id: 'skin_dark', category: 'SKIN_TONE' as const, name: 'Dark Skin', unlockLevel: 1, purchaseCostCoins: 0, sortOrder: 3 },
  { id: 'hair_short', category: 'HAIR' as const, name: 'Short Hair', unlockLevel: 1, purchaseCostCoins: 0, sortOrder: 1 },
  { id: 'hair_long', category: 'HAIR' as const, name: 'Long Hair', unlockLevel: 2, purchaseCostCoins: 50, sortOrder: 2 },
  { id: 'hair_curly', category: 'HAIR' as const, name: 'Curly Hair', unlockLevel: 3, purchaseCostCoins: 75, sortOrder: 3 },
  { id: 'outfit_overalls', category: 'OUTFIT' as const, name: 'Overalls', unlockLevel: 1, purchaseCostCoins: 0, sortOrder: 1 },
  { id: 'outfit_flannel', category: 'OUTFIT' as const, name: 'Flannel Shirt', unlockLevel: 3, purchaseCostCoins: 100, sortOrder: 2 },
  { id: 'outfit_sundress', category: 'OUTFIT' as const, name: 'Sundress', unlockLevel: 4, purchaseCostCoins: 120, sortOrder: 3 },
  { id: 'hat_straw', category: 'HAT' as const, name: 'Straw Hat', unlockLevel: 1, purchaseCostCoins: 0, sortOrder: 1 },
  { id: 'hat_beanie', category: 'HAT' as const, name: 'Beanie', unlockLevel: 2, purchaseCostCoins: 60, sortOrder: 2 },
  { id: 'hat_cowboy', category: 'HAT' as const, name: 'Cowboy Hat', unlockLevel: 6, purchaseCostCoins: 150, sortOrder: 3 },
  { id: 'acc_scarf', category: 'ACCESSORY' as const, name: 'Scarf', unlockLevel: 3, purchaseCostCoins: 80, sortOrder: 1 },
];

// Phase 4 decorations. No grid placement yet (like Buildings) — buying one
// just adds farmValueBonus to the player's flex stat.
const DECORATION_TYPES = [
  { id: 'path_stone', name: 'Stone Path', unlockLevel: 1, purchaseCostCoins: 20, farmValueBonus: 1, sortOrder: 1 },
  { id: 'fence_wood', name: 'Wooden Fence', unlockLevel: 1, purchaseCostCoins: 30, farmValueBonus: 2, sortOrder: 2 },
  { id: 'tree_oak', name: 'Oak Tree', unlockLevel: 3, purchaseCostCoins: 80, farmValueBonus: 5, sortOrder: 3 },
  { id: 'statue_scarecrow', name: 'Scarecrow Statue', unlockLevel: 5, purchaseCostCoins: 150, farmValueBonus: 10, sortOrder: 4 },
  { id: 'fountain', name: 'Fountain', unlockLevel: 8, purchaseCostCoins: 400, farmValueBonus: 25, sortOrder: 5 },
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
  { id: 'fishing_bronze', category: 'FISHING' as const, tier: 'BRONZE' as const, name: 'First Catch', description: 'Catch 5 fish', statKey: 'fishCaught', targetValue: 5, rewardCoins: 25, rewardDiamonds: 0, rewardXp: 8, sortOrder: 1 },
  { id: 'fishing_silver', category: 'FISHING' as const, tier: 'SILVER' as const, name: 'Angler', description: 'Catch 50 fish', statKey: 'fishCaught', targetValue: 50, rewardCoins: 150, rewardDiamonds: 8, rewardXp: 25, sortOrder: 2 },
  { id: 'fishing_gold', category: 'FISHING' as const, tier: 'GOLD' as const, name: 'Master Angler', description: 'Catch 200 fish', statKey: 'fishCaught', targetValue: 200, rewardCoins: 600, rewardDiamonds: 20, rewardXp: 60, sortOrder: 3 },
];

// Phase 2 (GAME_DESIGN.md §6.10). DailyMissionService picks 3 of these per UTC day.
const DAILY_MISSIONS = [
  { id: 'daily_harvest', statKey: 'cropsHarvested', targetValue: 10, rewardCoins: 15, rewardXp: 5, description: 'Harvest 10 crops', sortOrder: 1 },
  { id: 'daily_collect', statKey: 'animalsCollected', targetValue: 3, rewardCoins: 20, rewardXp: 8, description: 'Collect 3 animal products', sortOrder: 2 },
  { id: 'daily_craft', statKey: 'goodsCrafted', targetValue: 2, rewardCoins: 25, rewardXp: 10, description: 'Craft 2 goods', sortOrder: 3 },
  { id: 'daily_deliver', statKey: 'ordersFulfilled', targetValue: 1, rewardCoins: 30, rewardXp: 10, description: 'Fulfill 1 truck order', sortOrder: 4 },
  { id: 'daily_fish', statKey: 'fishCaught', targetValue: 3, rewardCoins: 20, rewardXp: 8, description: 'Catch 3 fish', sortOrder: 5 },
];

// IAP (GAME_DESIGN.md §6.18) — sandbox-mode product catalog.
const IAP_PRODUCTS = [
  { id: 'diamonds_small', name: 'Small Diamond Pack', diamondAmount: 50, priceUsdCents: 99, sortOrder: 1 },
  { id: 'diamonds_medium', name: 'Medium Diamond Pack', diamondAmount: 300, priceUsdCents: 499, sortOrder: 2 },
  { id: 'diamonds_large', name: 'Large Diamond Pack', diamondAmount: 700, priceUsdCents: 999, sortOrder: 3 },
  { id: 'starter_pack', name: 'Starter Pack', diamondAmount: 150, priceUsdCents: 199, sortOrder: 4 },
];

// Seasonal events (GAME_DESIGN.md §6.13) — one live event, config-driven.
// Fixed dates (not "now + N days") so re-running the seed doesn't shift the
// window on every reseed; extend endAt here to keep it running.
const SEASONAL_EVENT = {
  id: 'harvest_festival_2026',
  name: 'Harvest Festival',
  description: 'A harvest-season celebration — earn Festival Tokens from any farming, crafting, or order action.',
  currencyName: 'Festival Token',
  startAt: '2026-08-01T00:00:00Z',
  endAt: '2026-08-24T00:00:00Z',
};

const EVENT_REWARD_TIERS = [
  { tierIndex: 1, thresholdCurrency: 10, rewardCoins: 20, rewardDiamonds: 0, rewardXp: 0 },
  { tierIndex: 2, thresholdCurrency: 50, rewardCoins: 75, rewardDiamonds: 0, rewardXp: 10 },
  { tierIndex: 3, thresholdCurrency: 150, rewardCoins: 150, rewardDiamonds: 5, rewardXp: 20 },
  { tierIndex: 4, thresholdCurrency: 400, rewardCoins: 300, rewardDiamonds: 10, rewardXp: 40 },
  { tierIndex: 5, thresholdCurrency: 800, rewardCoins: 0, rewardDiamonds: 25, rewardXp: 75 },
  { tierIndex: 6, thresholdCurrency: 1500, rewardCoins: 1000, rewardDiamonds: 50, rewardXp: 150 },
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

  for (const townShopType of TOWN_SHOP_TYPES) {
    await prisma.townShopType.upsert({ where: { id: townShopType.id }, update: townShopType, create: townShopType });
  }
  console.log(`Seeded ${TOWN_SHOP_TYPES.length} town shop types.`);

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

  for (const fish of FISH_TYPES) {
    await prisma.fishType.upsert({ where: { id: fish.id }, update: fish, create: fish });
  }
  console.log(`Seeded ${FISH_TYPES.length} fish types.`);

  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievementDefinition.upsert({ where: { id: achievement.id }, update: achievement, create: achievement });
  }
  console.log(`Seeded ${ACHIEVEMENTS.length} achievements.`);

  for (const mission of DAILY_MISSIONS) {
    await prisma.dailyMissionDefinition.upsert({ where: { id: mission.id }, update: mission, create: mission });
  }
  console.log(`Seeded ${DAILY_MISSIONS.length} daily mission definitions.`);

  for (const cosmetic of COSMETIC_TYPES) {
    await prisma.cosmeticType.upsert({ where: { id: cosmetic.id }, update: cosmetic, create: cosmetic });
  }
  console.log(`Seeded ${COSMETIC_TYPES.length} cosmetic types.`);

  for (const decoration of DECORATION_TYPES) {
    await prisma.decorationType.upsert({ where: { id: decoration.id }, update: decoration, create: decoration });
  }
  console.log(`Seeded ${DECORATION_TYPES.length} decoration types.`);

  for (const product of IAP_PRODUCTS) {
    await prisma.iapProduct.upsert({ where: { id: product.id }, update: product, create: product });
  }
  console.log(`Seeded ${IAP_PRODUCTS.length} IAP products.`);

  const event = await prisma.seasonalEvent.upsert({
    where: { id: SEASONAL_EVENT.id },
    update: { ...SEASONAL_EVENT, startAt: new Date(SEASONAL_EVENT.startAt), endAt: new Date(SEASONAL_EVENT.endAt) },
    create: { ...SEASONAL_EVENT, startAt: new Date(SEASONAL_EVENT.startAt), endAt: new Date(SEASONAL_EVENT.endAt) },
  });
  for (const tier of EVENT_REWARD_TIERS) {
    await prisma.eventRewardTier.upsert({
      where: { eventId_tierIndex: { eventId: event.id, tierIndex: tier.tierIndex } },
      update: tier,
      create: { ...tier, eventId: event.id },
    });
  }
  console.log(`Seeded seasonal event "${event.name}" with ${EVENT_REWARD_TIERS.length} reward tiers.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
