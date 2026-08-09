using System.Collections.Generic;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /friends/*. See GAME_DESIGN.md §6.12.</summary>
    public class FriendService
    {
        private readonly ApiClient _api;

        public FriendService(ApiClient api)
        {
            _api = api;
        }

        public Task<List<FriendDto>> GetFriendsAsync() => _api.GetAsync<List<FriendDto>>("/friends");

        public Task<List<FriendRequestDto>> GetIncomingRequestsAsync() => _api.GetAsync<List<FriendRequestDto>>("/friends/requests");

        public Task<FriendRequestDto> SendRequestAsync(string targetUserId)
        {
            return _api.PostAsync<FriendRequestDto>("/friends/request", new { targetUserId });
        }

        public Task<FriendRequestDto> AcceptAsync(string friendshipId)
        {
            return _api.PostAsync<FriendRequestDto>("/friends/accept", new { friendshipId });
        }

        public Task<Unit> DeclineAsync(string friendshipId)
        {
            return _api.PostAsync<Unit>("/friends/decline", new { friendshipId });
        }

        public Task<Unit> RemoveAsync(string friendshipId)
        {
            return _api.PostAsync<Unit>("/friends/remove", new { friendshipId });
        }

        public Task<FarmDto> ViewFriendFarmAsync(string friendId) => _api.GetAsync<FarmDto>($"/friends/{friendId}/farm");

        public Task<FriendHelpResultDto> HelpAsync(string friendId)
        {
            return _api.PostAsync<FriendHelpResultDto>($"/friends/{friendId}/help", new { });
        }

        public Task<FriendGiftResultDto> GiftAsync(string friendId)
        {
            return _api.PostAsync<FriendGiftResultDto>($"/friends/{friendId}/gift", new { });
        }
    }
}
