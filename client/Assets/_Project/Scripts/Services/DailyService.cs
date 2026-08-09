using System.Collections.Generic;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /daily/*. See GAME_DESIGN.md §6.10.</summary>
    public class DailyService
    {
        private readonly ApiClient _api;

        public DailyService(ApiClient api)
        {
            _api = api;
        }

        public Task<LoginBonusStatusDto> GetLoginBonusStatusAsync() => _api.GetAsync<LoginBonusStatusDto>("/daily/login-bonus");

        public Task<LoginBonusClaimResultDto> ClaimLoginBonusAsync() => _api.PostAsync<LoginBonusClaimResultDto>("/daily/login-bonus/claim");

        public Task<List<DailyMissionProgressDto>> GetMissionsAsync() => _api.GetAsync<List<DailyMissionProgressDto>>("/daily/missions");

        public Task<MissionClaimResultDto> ClaimMissionAsync(string assignmentId)
        {
            return _api.PostAsync<MissionClaimResultDto>("/daily/missions/claim", new { assignmentId });
        }
    }
}
