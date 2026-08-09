using System.Collections.Generic;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /cosmetics/*. See GAME_DESIGN.md §12 Phase 4.</summary>
    public class CosmeticService
    {
        private readonly ApiClient _api;

        public CosmeticService(ApiClient api)
        {
            _api = api;
        }

        public Task<List<CosmeticTypeDto>> GetTypesAsync() => _api.GetAsync<List<CosmeticTypeDto>>("/cosmetics/types");

        public Task<MyCosmeticsDto> GetMineAsync() => _api.GetAsync<MyCosmeticsDto>("/cosmetics/mine");

        public Task<PlayerCosmeticDto> BuyAsync(string cosmeticTypeId)
        {
            return _api.PostAsync<PlayerCosmeticDto>("/cosmetics/buy", new { cosmeticTypeId });
        }

        public Task<PlayerEquippedCosmeticDto> EquipAsync(string cosmeticTypeId)
        {
            return _api.PostAsync<PlayerEquippedCosmeticDto>("/cosmetics/equip", new { cosmeticTypeId });
        }
    }
}
