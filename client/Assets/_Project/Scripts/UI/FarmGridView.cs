using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;
using Harvesto.Services;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Harvesto.UI
{
    /// <summary>
    /// Renders the farm grid from FarmService.GetFarmAsync() and handles
    /// tap-to-plant / tap-to-harvest. Tiles are plain runtime-generated
    /// sprites (no imported art yet) — see client/README.md for what's
    /// still missing before this is real gameplay UI.
    ///
    /// Timers are client-predicted (FarmTileView recolors locally as soon
    /// as PlantedCropDto.IsReady flips) but every actual harvest still
    /// round-trips to the server, which is the authority — see
    /// GAME_DESIGN.md §9.2/§9.4.
    /// </summary>
    public class FarmGridView : MonoBehaviour
    {
        private FarmService _farmService;
        private InventoryService _inventoryService;
        private EconomyService _economyService;
        private FarmHud _hud;
        private FarmActionsUI _actionsUi;

        private FarmDto _farm;
        private readonly Dictionary<(int x, int y), FarmTileView> _tileViews = new();
        private readonly HashSet<(int x, int y)> _busyTiles = new();

        public async void Initialize(FarmService farmService, InventoryService inventoryService, EconomyService economyService)
        {
            _farmService = farmService;
            _inventoryService = inventoryService;
            _economyService = economyService;

            _hud = gameObject.AddComponent<FarmHud>();
            _hud.SetStatus("Loading farm...");

            var cropTypes = await _farmService.GetCropTypesAsync();
            var wallet = await _economyService.GetWalletAsync();
            _farm = await _farmService.GetFarmAsync();

            BuildTiles();
            FitCameraToGrid();

            _actionsUi = gameObject.AddComponent<FarmActionsUI>();
            _actionsUi.Initialize(cropTypes, wallet.level, _inventoryService, RefreshHudAsync);

            await RefreshHudAsync();
            Debug.Log($"[Harvesto] Farm grid ready: {_tileViews.Count} tiles ({_farm.gridWidth}x{_farm.gridHeight}).");
        }

        /// <summary>Lets other panels (e.g. ProductionUI) trigger a wallet/silo/barn refresh after their own actions.</summary>
        public async Task RefreshEconomyDisplaysAsync()
        {
            await RefreshHudAsync();
            await _actionsUi.RefreshInventoryAsync();
        }

        private void Update()
        {
            if (_farm == null) return;

            foreach (var view in _tileViews.Values)
            {
                view.RefreshVisual();
            }

            if (Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame)
            {
                HandleClick(Mouse.current.position.ReadValue());
            }
        }

        private void HandleClick(Vector2 screenPosition)
        {
            var cam = Camera.main;
            if (cam == null) return;

            var worldPoint = cam.ScreenToWorldPoint(new Vector3(screenPosition.x, screenPosition.y, -cam.transform.position.z));
            var hit = Physics2D.OverlapPoint(worldPoint);
            if (hit == null) return;

            var tileView = hit.GetComponent<FarmTileView>();
            if (tileView == null) return;

            _ = HandleTileTappedAsync(tileView);
        }

        private async Task HandleTileTappedAsync(FarmTileView tileView)
        {
            var tile = tileView.Tile;
            var coord = (tile.x, tile.y);
            if (_busyTiles.Contains(coord)) return;

            if (tile.tileType != "FARMABLE")
            {
                _hud.SetStatus("That tile is locked.");
                return;
            }

            _busyTiles.Add(coord);
            try
            {
                if (tile.plantedCrop == null)
                {
                    await PlantAsync(tileView);
                }
                else if (tile.plantedCrop.IsReady)
                {
                    await HarvestAsync(tileView);
                }
                else
                {
                    var remaining = tile.plantedCrop.readyAt - System.DateTime.UtcNow;
                    _hud.SetStatus($"Still growing — ready in {remaining.TotalSeconds:0}s");
                }
            }
            finally
            {
                _busyTiles.Remove(coord);
            }
        }

        private async Task PlantAsync(FarmTileView tileView)
        {
            try
            {
                var planted = await _farmService.PlantAsync(tileView.Tile.x, tileView.Tile.y, _actionsUi.SelectedCropTypeId);
                tileView.Tile.plantedCrop = planted;
                tileView.RefreshVisual();
                await RefreshHudAsync();
            }
            catch (ApiException ex)
            {
                _hud.SetStatus($"Couldn't plant: {ex.Message}");
            }
        }

        private async Task HarvestAsync(FarmTileView tileView)
        {
            try
            {
                var result = await _farmService.HarvestAsync(tileView.Tile.id);
                tileView.Tile.plantedCrop = null;
                tileView.RefreshVisual();
                await RefreshHudAsync();
                await _actionsUi.RefreshInventoryAsync();
                _hud.SetStatus($"Harvested {result.harvestedCropTypeId}! +{result.xpGained} xp" + (result.leveledUp ? $" — level up! Now level {result.level}" : string.Empty));
            }
            catch (ApiException ex)
            {
                _hud.SetStatus($"Couldn't harvest: {ex.Message}");
            }
        }

        private async Task RefreshHudAsync()
        {
            var wallet = await _economyService.GetWalletAsync();
            var inventory = await _inventoryService.GetInventoryAsync();
            _hud.SetStatus(
                $"Level {wallet.level} ({wallet.xp} xp)\n" +
                $"Coins: {wallet.coins}   Diamonds: {wallet.diamonds}\n" +
                $"Silo: {inventory.silo.used}/{inventory.silo.capacity}   Barn: {inventory.barn.used}/{inventory.barn.capacity}\n" +
                $"Selected seed: {_actionsUi?.SelectedCropTypeId}\n" +
                "Tap an empty plot to plant, tap a ready crop to harvest.");
            _actionsUi?.SetPlayerLevel(wallet.level);
        }

        private void BuildTiles()
        {
            foreach (var tile in _farm.tiles)
            {
                var go = new GameObject($"Tile_{tile.x}_{tile.y}");
                go.transform.SetParent(transform, false);
                var view = go.AddComponent<FarmTileView>();
                view.Initialize(tile, UiSprites.Square);
                _tileViews[(tile.x, tile.y)] = view;
            }
        }

        private void FitCameraToGrid()
        {
            var cam = Camera.main;
            if (cam == null || !cam.orthographic) return;

            var requiredHeight = _farm.gridHeight / 2f;
            var requiredWidth = (_farm.gridWidth / 2f) / cam.aspect;
            cam.orthographicSize = Mathf.Max(requiredHeight, requiredWidth) * 1.1f;
            cam.transform.position = new Vector3(_farm.gridWidth / 2f, _farm.gridHeight / 2f, cam.transform.position.z);
        }
    }
}
