using UnityEditor;
using UnityEngine;

namespace Harvesto.EditorTools
{
    /// <summary>
    /// Forces every PNG under Resources/Icons to import as a UI sprite —
    /// dropping art in via automation (see how these files got here: a CC0
    /// pack, not the Editor's Asset > Import flow) skips the interactive
    /// import dialog that would normally set this.
    /// </summary>
    public class IconImportSettings : AssetPostprocessor
    {
        private void OnPreprocessTexture()
        {
            if (!assetPath.Contains("/Resources/Icons/")) return;

            var importer = (TextureImporter)assetImporter;
            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Single;
            importer.mipmapEnabled = false;
            importer.filterMode = FilterMode.Bilinear;
            importer.alphaIsTransparency = true;
        }
    }
}
