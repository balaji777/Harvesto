using System.Collections.Generic;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /mailbox/*. See GAME_DESIGN.md §6.10.</summary>
    public class MailboxService
    {
        private readonly ApiClient _api;

        public MailboxService(ApiClient api)
        {
            _api = api;
        }

        public Task<List<MailItemDto>> GetMailAsync() => _api.GetAsync<List<MailItemDto>>("/mailbox");

        public Task<ClaimMailResultDto> ClaimAsync(string mailItemId)
        {
            return _api.PostAsync<ClaimMailResultDto>("/mailbox/claim", new { mailItemId });
        }

        public Task<ClaimAllMailResultDto> ClaimAllAsync() => _api.PostAsync<ClaimAllMailResultDto>("/mailbox/claim-all");
    }
}
