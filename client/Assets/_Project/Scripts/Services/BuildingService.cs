using System.Collections.Generic;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /buildings/*. See GAME_DESIGN.md §6.4.</summary>
    public class BuildingService
    {
        private readonly ApiClient _api;

        public BuildingService(ApiClient api)
        {
            _api = api;
        }

        public Task<List<BuildingTypeDto>> GetBuildingTypesAsync() => _api.GetAsync<List<BuildingTypeDto>>("/buildings/types");

        public Task<List<RecipeDto>> GetRecipesAsync(string buildingTypeId = null)
        {
            var query = string.IsNullOrEmpty(buildingTypeId) ? string.Empty : $"?buildingTypeId={buildingTypeId}";
            return _api.GetAsync<List<RecipeDto>>($"/buildings/recipes{query}");
        }

        public Task<List<BuildingDto>> GetMyBuildingsAsync() => _api.GetAsync<List<BuildingDto>>("/buildings");

        public Task<BuildingDto> BuyAsync(string buildingTypeId)
        {
            return _api.PostAsync<BuildingDto>("/buildings/buy", new { buildingTypeId });
        }

        public Task<BuildingQueueEntryDto> CraftAsync(string buildingId, string recipeId)
        {
            return _api.PostAsync<BuildingQueueEntryDto>("/buildings/craft", new { buildingId, recipeId });
        }

        public Task<CollectResultDto> CollectAsync(string queueEntryId)
        {
            return _api.PostAsync<CollectResultDto>("/buildings/collect", new { queueEntryId });
        }
    }
}
