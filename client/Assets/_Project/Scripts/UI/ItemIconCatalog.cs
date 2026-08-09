using System.Collections.Generic;
using UnityEngine;

namespace Harvesto.UI
{
    /// <summary>
    /// Maps a server itemTypeId (plus a couple of UI-only keys like "coins"/
    /// "diamonds"/"locked") to a real CC0 icon — see
    /// Assets/_Project/Resources/Icons/CREDITS.txt for where each one came
    /// from. This is a deliberate partial pass, not a full re-skin: anything
    /// missing from the map falls back to no icon, and callers keep showing
    /// their existing flat color swatch instead.
    /// </summary>
    public static class ItemIconCatalog
    {
        private static readonly HashSet<string> KnownKeys = new()
        {
            "wheat", "corn", "carrot", "egg", "milk", "bread", "cake", "cheese", "pie",
            "coins", "diamonds", "locked",
        };

        private static readonly Dictionary<string, Sprite> Cache = new();

        public static bool TryGet(string key, out Sprite sprite)
        {
            sprite = null;
            if (string.IsNullOrEmpty(key) || !KnownKeys.Contains(key)) return false;

            if (Cache.TryGetValue(key, out sprite) && sprite != null) return true;

            sprite = Resources.Load<Sprite>($"Icons/{key}");
            if (sprite == null) return false;

            Cache[key] = sprite;
            return true;
        }
    }
}
