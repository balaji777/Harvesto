using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /economy/* (coins, diamonds, xp/level).</summary>
    public class EconomyService
    {
        private readonly ApiClient _api;

        public EconomyService(ApiClient api)
        {
            _api = api;
        }

        public Task<WalletDto> GetWalletAsync() => _api.GetAsync<WalletDto>("/economy/wallet");
    }
}
