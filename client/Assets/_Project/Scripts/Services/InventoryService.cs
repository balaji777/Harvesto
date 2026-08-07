using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /inventory/* (silo contents + selling).</summary>
    public class InventoryService
    {
        private readonly ApiClient _api;

        public InventoryService(ApiClient api)
        {
            _api = api;
        }

        public Task<InventoryDto> GetInventoryAsync() => _api.GetAsync<InventoryDto>("/inventory");

        public Task<SellResultDto> SellAsync(string itemTypeId, int quantity)
        {
            return _api.PostAsync<SellResultDto>("/inventory/sell", new { itemTypeId, quantity });
        }
    }
}
