using UnityEngine;

namespace Harvesto.Persistence
{
    /// <summary>
    /// Generates and persists a stable per-install id used for guest login.
    /// SystemInfo.deviceUniqueIdentifier is a fine default but is
    /// reset-on-reinstall on some platforms — a locally generated GUID is
    /// more predictable for dev/testing.
    /// </summary>
    public static class DeviceIdProvider
    {
        private const string PrefsKey = "harvesto.device_id";

        public static string GetOrCreate()
        {
            var existing = PlayerPrefs.GetString(PrefsKey, string.Empty);
            if (!string.IsNullOrEmpty(existing))
            {
                return existing;
            }

            var newId = System.Guid.NewGuid().ToString("N");
            PlayerPrefs.SetString(PrefsKey, newId);
            PlayerPrefs.Save();
            return newId;
        }
    }
}
