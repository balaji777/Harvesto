using System;
using System.Collections.Generic;

namespace Harvesto.Domain
{
    // These mirror the server's response shapes 1:1 (see server/src/**/*.controller.ts).
    // Keep field names identical to the JSON so Newtonsoft can map without attributes.

    [Serializable]
    public class AuthTokens
    {
        public string userId;
        public string username;
        public string accessToken;
        public string refreshToken;
    }

    [Serializable]
    public class MeDto
    {
        public string userId;
        public string username;
        public string email;
        public int level;
        public int xp;
        public int coins;
        public int diamonds;
        public string farmName;
    }

    [Serializable]
    public class WalletDto
    {
        public int level;
        public int xp;
        public int xpToNextLevel;
        public int coins;
        public int diamonds;
    }

    [Serializable]
    public class CropTypeDto
    {
        public string id;
        public string name;
        public int unlockLevel;
        public int growTimeSeconds;
        public int seedCostCoins;
        public int sellPriceCoins;
        public int xpOnHarvest;
        public int sortOrder;
    }

    [Serializable]
    public class PlantedCropDto
    {
        public string id;
        public string tileId;
        public string cropTypeId;
        public CropTypeDto cropType;
        public DateTime plantedAt;
        public DateTime readyAt;

        /// <summary>Client-side convenience — server is always the source of truth on resync.</summary>
        public bool IsReady => DateTime.UtcNow >= readyAt;
    }

    [Serializable]
    public class FarmTileDto
    {
        public string id;
        public string farmId;
        public int x;
        public int y;
        public string tileType; // "LOCKED" | "FARMABLE"
        public PlantedCropDto plantedCrop;
    }

    [Serializable]
    public class FarmDto
    {
        public string id;
        public string userId;
        public int gridWidth;
        public int gridHeight;
        public List<FarmTileDto> tiles;
    }

    [Serializable]
    public class InventoryItemDto
    {
        public string id;
        public string itemTypeId;
        public int quantity;
        public string storagePool;
    }

    [Serializable]
    public class InventoryPoolDto
    {
        public int capacity;
        public int used;
        public List<InventoryItemDto> items;
    }

    [Serializable]
    public class InventoryDto
    {
        public InventoryPoolDto silo;
        public InventoryPoolDto barn;
    }

    [Serializable]
    public class HarvestResultDto
    {
        public string harvestedCropTypeId;
        public int xpGained;
        public int level;
        public bool leveledUp;
    }

    [Serializable]
    public class SellResultDto
    {
        public int coinsEarned;
    }

    // --- Phase 2: animals ---------------------------------------------------

    [Serializable]
    public class AnimalTypeDto
    {
        public string id;
        public string name;
        public int unlockLevel;
        public int purchaseCostCoins;
        public string penBuildingTypeId;
        public string feedItemId;
        public int feedAmount;
        public int productionTimeSeconds;
        public string productItemId;
        public string productName;
        public int productSellPriceCoins;
        public int productXpOnCollect;
        public int sortOrder;
    }

    [Serializable]
    public class AnimalDto
    {
        public string id;
        public string buildingId;
        public string animalTypeId;
        public AnimalTypeDto animalType;
        public DateTime boughtAt;
        public DateTime? fedAt;
        public DateTime? productReadyAt;

        /// <summary>Client-side convenience — server is always the source of truth on resync.</summary>
        public bool IsReady => productReadyAt.HasValue && DateTime.UtcNow >= productReadyAt.Value;
        public bool IsIdle => !productReadyAt.HasValue;
    }

    // --- Phase 2: buildings & recipes ---------------------------------------

    [Serializable]
    public class BuildingTypeDto
    {
        public string id;
        public string name;
        public string category; // "PEN" | "FACTORY"
        public int unlockLevel;
        public int purchaseCostCoins;
        public int capacity;
        public int sortOrder;
    }

    [Serializable]
    public class RecipeIngredientDto
    {
        public string itemTypeId;
        public int quantity;
    }

    [Serializable]
    public class RecipeDto
    {
        public string id;
        public string buildingTypeId;
        public string name;
        public int unlockLevel;
        public int craftTimeSeconds;
        public string outputItemId;
        public int outputSellPriceCoins;
        public int outputXpOnCollect;
        public int sortOrder;
        public List<RecipeIngredientDto> ingredients;
    }

    [Serializable]
    public class BuildingQueueEntryDto
    {
        public string id;
        public string buildingId;
        public string recipeId;
        public RecipeDto recipe;
        public DateTime startedAt;
        public DateTime readyAt;
        public DateTime? collectedAt;

        /// <summary>Client-side convenience — server is always the source of truth on resync.</summary>
        public bool IsReady => DateTime.UtcNow >= readyAt;
    }

    [Serializable]
    public class BuildingDto
    {
        public string id;
        public string buildingTypeId;
        public BuildingTypeDto buildingType;
        public DateTime createdAt;
        public List<AnimalDto> animals;
        public List<BuildingQueueEntryDto> queueEntries;
    }

    [Serializable]
    public class CollectResultDto
    {
        public string collectedItemTypeId;
        public int xpGained;
        public int level;
        public bool leveledUp;
    }

    // --- Phase 2: truck orders ------------------------------------------------

    [Serializable]
    public class OrderRequirementDto
    {
        public string itemTypeId;
        public int quantity;
    }

    [Serializable]
    public class OrderDto
    {
        public string id;
        public string source; // "TRUCK" | "BOAT" | "TRAIN"
        public List<OrderRequirementDto> requirements;
        public int rewardCoins;
        public int rewardDiamonds;
        public int rewardXp;
        public DateTime createdAt;
        public DateTime expiresAt;
        public DateTime? fulfilledAt;
    }

    [Serializable]
    public class FulfillOrderResultDto
    {
        public int rewardCoins;
        public int rewardDiamonds;
        public int rewardXp;
        public int level;
        public bool leveledUp;
    }

    // --- Phase 3: friends -----------------------------------------------------

    [Serializable]
    public class FriendDto
    {
        public string friendshipId;
        public string userId;
        public string username;
        public int level;
    }

    [Serializable]
    public class FriendRequesterDto
    {
        public string id;
        public string username;
    }

    [Serializable]
    public class FriendRequestDto
    {
        public string id;
        public string requesterId;
        public string addresseeId;
        public string status; // "PENDING" | "ACCEPTED"
        public DateTime createdAt;
        public DateTime? respondedAt;
        public FriendRequesterDto requester;
    }

    [Serializable]
    public class FriendHelpResultDto
    {
        public int rewardCoins;
        public int rewardXp;
        public int level;
        public bool leveledUp;
    }

    [Serializable]
    public class FriendGiftResultDto
    {
        public string sentTo;
    }

    // --- Phase 4: fishing -------------------------------------------------------

    [Serializable]
    public class FishTypeDto
    {
        public string id;
        public string name;
        public int unlockLevel;
        public int sellPriceCoins;
        public int xpOnCatch;
        public int rarityWeight;
        public int sortOrder;
    }

    [Serializable]
    public class FishingStatusDto
    {
        public DateTime? castReadyAt;
        public bool isCasting;
        public bool isReady;
    }

    [Serializable]
    public class FishingCastResultDto
    {
        public DateTime castReadyAt;
    }

    [Serializable]
    public class FishingCollectResultDto
    {
        public string caughtFishTypeId;
        public string caughtFishName;
        public int xpGained;
        public int level;
        public bool leveledUp;
    }

    // --- Phase 4: character customization ---------------------------------------

    [Serializable]
    public class CosmeticTypeDto
    {
        public string id;
        public string category; // "SKIN_TONE" | "HAIR" | "OUTFIT" | "HAT" | "ACCESSORY"
        public string name;
        public int unlockLevel;
        public int purchaseCostCoins;
        public int sortOrder;
    }

    [Serializable]
    public class PlayerCosmeticDto
    {
        public string id;
        public string cosmeticTypeId;
        public CosmeticTypeDto cosmeticType;
        public DateTime unlockedAt;
    }

    [Serializable]
    public class PlayerEquippedCosmeticDto
    {
        public string id;
        public string category;
        public string cosmeticTypeId;
        public CosmeticTypeDto cosmeticType;
        public DateTime equippedAt;
    }

    [Serializable]
    public class MyCosmeticsDto
    {
        public List<PlayerCosmeticDto> owned;
        public List<PlayerEquippedCosmeticDto> equipped;
    }

    // --- Phase 4: decorations ----------------------------------------------------

    [Serializable]
    public class DecorationTypeDto
    {
        public string id;
        public string name;
        public int unlockLevel;
        public int purchaseCostCoins;
        public int farmValueBonus;
        public int sortOrder;
    }

    [Serializable]
    public class PlayerDecorationDto
    {
        public string id;
        public string decorationTypeId;
        public DecorationTypeDto decorationType;
        public int quantity;
    }

    [Serializable]
    public class FarmValueDto
    {
        public int farmValue;
    }
}
