using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;
using Harvesto.Persistence;

namespace Harvesto.Services
{
    /// <summary>
    /// Wraps /auth/*. On any successful login it saves tokens to
    /// TokenStore and arms the ApiClient with the fresh access token so
    /// every other service is immediately authenticated.
    /// </summary>
    public class AuthService
    {
        private readonly ApiClient _api;

        public AuthService(ApiClient api)
        {
            _api = api;
        }

        public async Task<AuthTokens> LoginAsGuestAsync(string deviceId)
        {
            var tokens = await _api.PostAsync<AuthTokens>("/auth/guest", new { deviceId });
            ApplyTokens(tokens);
            return tokens;
        }

        public async Task<AuthTokens> RegisterAsync(string email, string password, string username)
        {
            var tokens = await _api.PostAsync<AuthTokens>("/auth/register", new { email, password, username });
            ApplyTokens(tokens);
            return tokens;
        }

        public async Task<AuthTokens> LoginAsync(string email, string password)
        {
            var tokens = await _api.PostAsync<AuthTokens>("/auth/login", new { email, password });
            ApplyTokens(tokens);
            return tokens;
        }

        public async Task RefreshAsync()
        {
            var tokens = await _api.PostAsync<AuthTokens>("/auth/refresh", new { refreshToken = TokenStore.RefreshToken });
            ApplyTokens(tokens);
        }

        public async Task LogoutAsync()
        {
            await _api.PostAsync<Unit>("/auth/logout", new { refreshToken = TokenStore.RefreshToken });
            TokenStore.Clear();
        }

        public Task<MeDto> GetMeAsync()
        {
            return _api.GetAsync<MeDto>("/auth/me");
        }

        /// <summary>Restores a previous session's access token into the ApiClient on app start.</summary>
        public void RestoreSession()
        {
            if (TokenStore.HasTokens)
            {
                _api.SetAccessToken(TokenStore.AccessToken);
            }
        }

        private void ApplyTokens(AuthTokens tokens)
        {
            TokenStore.Save(tokens.accessToken, tokens.refreshToken);
            _api.SetAccessToken(tokens.accessToken);
        }
    }
}
