using System.Collections.Generic;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /fishing/*. See GAME_DESIGN.md §12 Phase 4.</summary>
    public class FishingService
    {
        private readonly ApiClient _api;

        public FishingService(ApiClient api)
        {
            _api = api;
        }

        public Task<List<FishTypeDto>> GetFishTypesAsync() => _api.GetAsync<List<FishTypeDto>>("/fishing/types");

        public Task<FishingStatusDto> GetStatusAsync() => _api.GetAsync<FishingStatusDto>("/fishing/status");

        public Task<FishingCastResultDto> CastAsync() => _api.PostAsync<FishingCastResultDto>("/fishing/cast");

        public Task<FishingCollectResultDto> CollectAsync() => _api.PostAsync<FishingCollectResultDto>("/fishing/collect");
    }
}
