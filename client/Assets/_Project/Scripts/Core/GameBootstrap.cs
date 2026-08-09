using Harvesto.Networking;
using Harvesto.Persistence;
using Harvesto.Services;
using Harvesto.UI;
using UnityEngine;

namespace Harvesto.Core
{
    /// <summary>
    /// App entry point: attach to one GameObject in the bootstrap scene.
    /// Logs in as guest, then hands the authenticated services to
    /// FarmGridView (farm/crops) and ProductionUI (buildings/animals/
    /// orders/friends/fishing/cosmetics/decorations).
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        [SerializeField] private string apiBaseUrl = "http://localhost:3000/api";

        private ApiClient _api;
        private AuthService _authService;
        private FarmService _farmService;
        private InventoryService _inventoryService;
        private EconomyService _economyService;
        private AnimalService _animalService;
        private BuildingService _buildingService;
        private OrderService _orderService;
        private FriendService _friendService;
        private FishingService _fishingService;
        private CosmeticService _cosmeticService;
        private DecorationService _decorationService;

        private async void Start()
        {
            _api = new ApiClient(apiBaseUrl);
            _authService = new AuthService(_api);
            _farmService = new FarmService(_api);
            _inventoryService = new InventoryService(_api);
            _economyService = new EconomyService(_api);
            _animalService = new AnimalService(_api);
            _buildingService = new BuildingService(_api);
            _orderService = new OrderService(_api);
            _friendService = new FriendService(_api);
            _fishingService = new FishingService(_api);
            _cosmeticService = new CosmeticService(_api);
            _decorationService = new DecorationService(_api);

            try
            {
                var deviceId = DeviceIdProvider.GetOrCreate();
                var tokens = await _authService.LoginAsGuestAsync(deviceId);
                Debug.Log($"[Harvesto] Logged in as guest — userId={tokens.userId} username={tokens.username}");

                var gridView = gameObject.AddComponent<FarmGridView>();
                gridView.Initialize(_farmService, _inventoryService, _economyService);

                var productionUi = gameObject.AddComponent<ProductionUI>();
                productionUi.Initialize(
                    _buildingService,
                    _animalService,
                    _orderService,
                    _friendService,
                    _fishingService,
                    _cosmeticService,
                    _decorationService,
                    gridView.RefreshEconomyDisplaysAsync);
            }
            catch (ApiException ex)
            {
                Debug.LogError($"[Harvesto] API error: {ex.Message}");
            }
        }
    }
}
