using System.Collections.Generic;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /decorations/*. See GAME_DESIGN.md §12 Phase 4.</summary>
    public class DecorationService
    {
        private readonly ApiClient _api;

        public DecorationService(ApiClient api)
        {
            _api = api;
        }

        public Task<List<DecorationTypeDto>> GetTypesAsync() => _api.GetAsync<List<DecorationTypeDto>>("/decorations/types");

        public Task<List<PlayerDecorationDto>> GetMineAsync() => _api.GetAsync<List<PlayerDecorationDto>>("/decorations/mine");

        public Task<PlayerDecorationDto> BuyAsync(string decorationTypeId, int quantity)
        {
            return _api.PostAsync<PlayerDecorationDto>("/decorations/buy", new { decorationTypeId, quantity });
        }

        public Task<FarmValueDto> GetFarmValueAsync() => _api.GetAsync<FarmValueDto>("/decorations/farm-value");
    }
}
