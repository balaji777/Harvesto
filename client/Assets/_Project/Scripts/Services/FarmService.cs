using System.Collections.Generic;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /farm/*. See GAME_DESIGN.md §6.2 for crop pacing.</summary>
    public class FarmService
    {
        private readonly ApiClient _api;

        public FarmService(ApiClient api)
        {
            _api = api;
        }

        public Task<FarmDto> GetFarmAsync() => _api.GetAsync<FarmDto>("/farm");

        public Task<List<CropTypeDto>> GetCropTypesAsync() => _api.GetAsync<List<CropTypeDto>>("/farm/crop-types");

        public Task<PlantedCropDto> PlantAsync(int x, int y, string cropTypeId)
        {
            return _api.PostAsync<PlantedCropDto>("/farm/plant", new { x, y, cropTypeId });
        }

        public Task<HarvestResultDto> HarvestAsync(string tileId)
        {
            return _api.PostAsync<HarvestResultDto>("/farm/harvest", new { tileId });
        }
    }
}
