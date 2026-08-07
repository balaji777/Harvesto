using UnityEngine;

namespace Harvesto.Persistence
{
    /// <summary>
    /// Persists auth tokens locally. PlayerPrefs is plaintext and fine for
    /// dev builds only — before shipping, swap this for Keychain (iOS) /
    /// EncryptedSharedPreferences (Android) backed storage.
    /// </summary>
    public static class TokenStore
    {
        private const string AccessTokenKey = "harvesto.access_token";
        private const string RefreshTokenKey = "harvesto.refresh_token";

        public static string AccessToken
        {
            get => PlayerPrefs.GetString(AccessTokenKey, string.Empty);
            set => PlayerPrefs.SetString(AccessTokenKey, value);
        }

        public static string RefreshToken
        {
            get => PlayerPrefs.GetString(RefreshTokenKey, string.Empty);
            set => PlayerPrefs.SetString(RefreshTokenKey, value);
        }

        public static bool HasTokens => !string.IsNullOrEmpty(RefreshToken);

        public static void Save(string accessToken, string refreshToken)
        {
            AccessToken = accessToken;
            RefreshToken = refreshToken;
            PlayerPrefs.Save();
        }

        public static void Clear()
        {
            PlayerPrefs.DeleteKey(AccessTokenKey);
            PlayerPrefs.DeleteKey(RefreshTokenKey);
            PlayerPrefs.Save();
        }
    }
}
