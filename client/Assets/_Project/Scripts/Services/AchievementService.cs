using System.Collections.Generic;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /achievements/*. See GAME_DESIGN.md §6.9.</summary>
    public class AchievementService
    {
        private readonly ApiClient _api;

        public AchievementService(ApiClient api)
        {
            _api = api;
        }

        public Task<List<AchievementDefinitionDto>> GetDefinitionsAsync() => _api.GetAsync<List<AchievementDefinitionDto>>("/achievements");

        public Task<List<PlayerAchievementDto>> GetMineAsync() => _api.GetAsync<List<PlayerAchievementDto>>("/achievements/mine");
    }
}
