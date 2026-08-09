using Harvesto.Domain;
using UnityEngine;

namespace Harvesto.UI
{
    /// <summary>One grid cell: owns its own visual state, driven by FarmGridView.</summary>
    [RequireComponent(typeof(SpriteRenderer), typeof(BoxCollider2D))]
    public class FarmTileView : MonoBehaviour
    {
        private static readonly Color LockedColor = new Color(0.25f, 0.22f, 0.2f);
        private static readonly Color EmptyColor = new Color(0.47f, 0.33f, 0.19f);
        private static readonly Color GrowingColor = new Color(0.29f, 0.55f, 0.24f);
        private static readonly Color ReadyColor = new Color(0.95f, 0.78f, 0.2f);
        private static readonly Color LockIconColor = new Color(0.85f, 0.8f, 0.7f);

        public FarmTileDto Tile { get; private set; }
        private SpriteRenderer _renderer;
        private SpriteRenderer _lockIconRenderer;

        public void Initialize(FarmTileDto tile, Sprite squareSprite)
        {
            _renderer = GetComponent<SpriteRenderer>();
            _renderer.sprite = squareSprite;
            transform.position = new Vector3(tile.x, tile.y, 0f);
            transform.localScale = Vector3.one * 0.92f;

            // Small lock glyph layered on top of the LOCKED tile's color fill —
            // real CC0 art (see ItemIconCatalog), falls back to color-only if missing.
            if (ItemIconCatalog.TryGet("locked", out var lockSprite))
            {
                var lockGo = new GameObject("LockIcon");
                lockGo.transform.SetParent(transform, false);
                lockGo.transform.localPosition = new Vector3(0f, 0f, -0.1f);
                lockGo.transform.localScale = Vector3.one * 0.5f;
                _lockIconRenderer = lockGo.AddComponent<SpriteRenderer>();
                _lockIconRenderer.sprite = lockSprite;
                _lockIconRenderer.color = LockIconColor;
                _lockIconRenderer.sortingOrder = 1;
            }

            SetTile(tile);
        }

        public void SetTile(FarmTileDto tile)
        {
            Tile = tile;
            RefreshVisual();
        }

        /// <summary>Called every frame by FarmGridView so growing->ready flips without a server round trip.</summary>
        public void RefreshVisual()
        {
            var isLocked = Tile.tileType != "FARMABLE";
            if (_lockIconRenderer != null) _lockIconRenderer.gameObject.SetActive(isLocked);

            if (isLocked)
            {
                _renderer.color = LockedColor;
            }
            else if (Tile.plantedCrop == null)
            {
                _renderer.color = EmptyColor;
            }
            else
            {
                _renderer.color = Tile.plantedCrop.IsReady ? ReadyColor : GrowingColor;
            }
        }
    }
}
