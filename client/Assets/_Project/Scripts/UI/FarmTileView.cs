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

        public FarmTileDto Tile { get; private set; }
        private SpriteRenderer _renderer;

        public void Initialize(FarmTileDto tile, Sprite squareSprite)
        {
            _renderer = GetComponent<SpriteRenderer>();
            _renderer.sprite = squareSprite;
            transform.position = new Vector3(tile.x, tile.y, 0f);
            transform.localScale = Vector3.one * 0.92f;
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
            if (Tile.tileType != "FARMABLE")
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
