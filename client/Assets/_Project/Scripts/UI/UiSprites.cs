using UnityEngine;

namespace Harvesto.UI
{
    /// <summary>Shared runtime-generated placeholder sprite — see FarmHud.cs for why (no art pipeline yet).</summary>
    internal static class UiSprites
    {
        private static Sprite _square;
        public static Sprite Square => _square != null ? _square : (_square = CreateSquare());

        private static Sprite CreateSquare()
        {
            var texture = new Texture2D(1, 1);
            texture.SetPixel(0, 0, Color.white);
            texture.Apply();
            return Sprite.Create(texture, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
        }
    }
}
