using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;
using Harvesto.Services;
using UnityEngine;
using UnityEngine.UI;

namespace Harvesto.UI
{
    /// <summary>
    /// Phase 2 production economy panel: three tabs (Buildings, Animals,
    /// Orders) covering buy/craft/collect/feed/fulfill. Runtime-built uGUI,
    /// same no-imported-assets approach as the rest of the Phase 1 UI — this
    /// is functional placeholder UI, not final art or layout.
    /// </summary>
    public class ProductionUI : MonoBehaviour
    {
        private enum Tab { Buildings, Animals, Orders }

        private BuildingService _buildingService;
        private AnimalService _animalService;
        private OrderService _orderService;
        private Func<Task> _onEconomyChanged;

        private Text _statusText;
        private readonly Dictionary<Tab, Transform> _tabContentRoots = new();
        private readonly Dictionary<Tab, Image> _tabButtonBackgrounds = new();
        private Tab _activeTab = Tab.Buildings;

        private List<BuildingTypeDto> _buildingTypes;
        private List<BuildingDto> _myBuildings;
        private List<RecipeDto> _recipes;
        private List<AnimalTypeDto> _animalTypes;
        private List<AnimalDto> _myAnimals;
        private List<OrderDto> _truckOrders;

        public void Initialize(BuildingService buildingService, AnimalService animalService, OrderService orderService, Func<Task> onEconomyChanged)
        {
            _buildingService = buildingService;
            _animalService = animalService;
            _orderService = orderService;
            _onEconomyChanged = onEconomyChanged;

            BuildLayout();
            SetActiveTab(Tab.Buildings);
            _ = RefreshAllAsync();
        }

        private async Task RefreshAllAsync()
        {
            _buildingTypes = await _buildingService.GetBuildingTypesAsync();
            _myBuildings = await _buildingService.GetMyBuildingsAsync();
            _recipes = await _buildingService.GetRecipesAsync();
            _animalTypes = await _animalService.GetAnimalTypesAsync();
            _myAnimals = await _animalService.GetMyAnimalsAsync();
            _truckOrders = await _orderService.GetTruckOrdersAsync();

            RenderBuildingsTab();
            RenderAnimalsTab();
            RenderOrdersTab();

            Debug.Log($"[Harvesto] Production UI ready: {_buildingTypes.Count} building types, {_animalTypes.Count} animal types, {_truckOrders.Count} truck orders.");
        }

        // --- Buildings tab -------------------------------------------------

        private void RenderBuildingsTab()
        {
            var root = _tabContentRoots[Tab.Buildings];
            ClearChildren(root);

            BuildHeader(root, "Buy a building");
            foreach (var type in _buildingTypes)
            {
                var owned = _myBuildings.Any(b => b.buildingTypeId == type.id);
                var label = $"{type.name} ({type.category}) — {type.purchaseCostCoins}c, unlocks lvl {type.unlockLevel}";
                var buttonLabel = owned ? "Owned" : "Buy";
                BuildRow(root, label, buttonLabel, owned ? (Action)null : () => Buy(type.id), !owned);
            }

            BuildHeader(root, "Your buildings");
            foreach (var building in _myBuildings)
            {
                if (building.buildingType.category == "FACTORY")
                {
                    RenderFactoryRows(root, building);
                }
                else
                {
                    var count = building.animals?.Count ?? 0;
                    BuildRow(root, $"{building.buildingType.name} — {count}/{building.buildingType.capacity} animals");
                }
            }
        }

        private void RenderFactoryRows(Transform root, BuildingDto building)
        {
            var activeEntry = building.queueEntries?.FirstOrDefault(q => q.collectedAt == null);
            if (activeEntry != null)
            {
                if (activeEntry.IsReady)
                {
                    BuildRow(root, $"{building.buildingType.name}: {activeEntry.recipe.name} ready!", "Collect", () => CollectCraft(activeEntry.id));
                }
                else
                {
                    var remaining = (activeEntry.readyAt - DateTime.UtcNow).TotalSeconds;
                    BuildRow(root, $"{building.buildingType.name}: {activeEntry.recipe.name} ready in {remaining:0}s");
                }
                return;
            }

            var recipesForBuilding = _recipes.Where(r => r.buildingTypeId == building.buildingTypeId).ToList();
            if (recipesForBuilding.Count == 0)
            {
                BuildRow(root, $"{building.buildingType.name}: no recipes yet");
                return;
            }

            foreach (var recipe in recipesForBuilding)
            {
                var ingredients = string.Join(", ", recipe.ingredients.Select(i => $"{i.quantity}x {i.itemTypeId}"));
                BuildRow(root, $"{building.buildingType.name}: craft {recipe.name} ({ingredients})", "Craft", () => Craft(building.id, recipe.id));
            }
        }

        // --- Animals tab -----------------------------------------------------

        private void RenderAnimalsTab()
        {
            var root = _tabContentRoots[Tab.Animals];
            ClearChildren(root);

            BuildHeader(root, "Buy an animal");
            foreach (var type in _animalTypes)
            {
                var pen = _myBuildings.FirstOrDefault(b => b.buildingTypeId == type.penBuildingTypeId);
                var label = $"{type.name} — {type.purchaseCostCoins}c, unlocks lvl {type.unlockLevel}, needs {type.penBuildingTypeId}";

                if (pen == null)
                {
                    BuildRow(root, label + " (no pen owned)");
                }
                else
                {
                    var full = (pen.animals?.Count ?? 0) >= pen.buildingType.capacity;
                    BuildRow(root, label, full ? "Pen full" : "Buy", full ? (Action)null : () => BuyAnimal(type.id, pen.id), !full);
                }
            }

            BuildHeader(root, "Your animals");
            foreach (var animal in _myAnimals)
            {
                if (animal.IsIdle)
                {
                    BuildRow(root, $"{animal.animalType.name}: idle", "Feed", () => Feed(animal.id));
                }
                else if (animal.IsReady)
                {
                    BuildRow(root, $"{animal.animalType.name}: {animal.animalType.productName} ready!", "Collect", () => CollectAnimal(animal.id));
                }
                else
                {
                    var remaining = (animal.productReadyAt.Value - DateTime.UtcNow).TotalSeconds;
                    BuildRow(root, $"{animal.animalType.name}: producing, ready in {remaining:0}s");
                }
            }
        }

        // --- Orders tab ------------------------------------------------------

        private void RenderOrdersTab()
        {
            var root = _tabContentRoots[Tab.Orders];
            ClearChildren(root);

            BuildHeader(root, "Truck orders");
            foreach (var order in _truckOrders)
            {
                var requirements = string.Join(", ", order.requirements.Select(r => $"{r.quantity}x {r.itemTypeId}"));
                var label = $"Need {requirements} — reward {order.rewardCoins}c, {order.rewardXp}xp";
                BuildRow(root, label, "Fulfill", () => Fulfill(order.id));
            }
        }

        // --- Actions -----------------------------------------------------------

        private async void Buy(string buildingTypeId)
        {
            await RunAction(() => _buildingService.BuyAsync(buildingTypeId), "buy building");
        }

        private async void Craft(string buildingId, string recipeId)
        {
            await RunAction(() => _buildingService.CraftAsync(buildingId, recipeId), "craft");
        }

        private async void CollectCraft(string queueEntryId)
        {
            await RunAction(() => _buildingService.CollectAsync(queueEntryId), "collect craft");
        }

        private async void BuyAnimal(string animalTypeId, string buildingId)
        {
            await RunAction(() => _animalService.BuyAsync(animalTypeId, buildingId), "buy animal");
        }

        private async void Feed(string animalId)
        {
            await RunAction(() => _animalService.FeedAsync(animalId), "feed animal");
        }

        private async void CollectAnimal(string animalId)
        {
            await RunAction(() => _animalService.CollectAsync(animalId), "collect animal product");
        }

        private async void Fulfill(string orderId)
        {
            await RunAction(() => _orderService.FulfillAsync(orderId), "fulfill order");
        }

        private async Task RunAction<T>(Func<Task<T>> action, string description)
        {
            try
            {
                await action();
                _statusText.text = string.Empty;
                await RefreshAllAsync();
                if (_onEconomyChanged != null) await _onEconomyChanged();
            }
            catch (ApiException ex)
            {
                _statusText.text = $"Couldn't {description}: {ex.Message}";
            }
        }

        // --- Layout scaffolding --------------------------------------------

        private void BuildLayout()
        {
            var canvasGo = new GameObject("ProductionCanvas");
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGo.AddComponent<CanvasScaler>();
            canvasGo.AddComponent<GraphicRaycaster>();

            var tabBarGo = new GameObject("TabBar", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            tabBarGo.transform.SetParent(canvasGo.transform, false);
            var tabBarRect = (RectTransform)tabBarGo.transform;
            tabBarRect.anchorMin = new Vector2(0.5f, 1f);
            tabBarRect.anchorMax = new Vector2(0.5f, 1f);
            tabBarRect.pivot = new Vector2(0.5f, 1f);
            tabBarRect.anchoredPosition = new Vector2(0f, -16f);
            tabBarRect.sizeDelta = new Vector2(360f, 32f);
            var tabBarLayout = tabBarGo.GetComponent<HorizontalLayoutGroup>();
            tabBarLayout.spacing = 4f;
            tabBarLayout.childForceExpandWidth = true;
            tabBarLayout.childForceExpandHeight = true;

            foreach (Tab tab in Enum.GetValues(typeof(Tab)))
            {
                BuildTabButton(tabBarGo.transform, tab);
            }

            var statusGo = new GameObject("Status");
            statusGo.transform.SetParent(canvasGo.transform, false);
            _statusText = statusGo.AddComponent<Text>();
            _statusText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            _statusText.fontSize = 14;
            _statusText.color = new Color(1f, 0.6f, 0.6f);
            _statusText.alignment = TextAnchor.UpperCenter;
            var statusRect = _statusText.rectTransform;
            statusRect.anchorMin = new Vector2(0.5f, 1f);
            statusRect.anchorMax = new Vector2(0.5f, 1f);
            statusRect.pivot = new Vector2(0.5f, 1f);
            statusRect.anchoredPosition = new Vector2(0f, -52f);
            statusRect.sizeDelta = new Vector2(500f, 24f);

            foreach (Tab tab in Enum.GetValues(typeof(Tab)))
            {
                var panelGo = new GameObject($"{tab}Panel", typeof(RectTransform), typeof(Image), typeof(VerticalLayoutGroup), typeof(ContentSizeFitter));
                panelGo.transform.SetParent(canvasGo.transform, false);
                var panelRect = (RectTransform)panelGo.transform;
                panelRect.anchorMin = new Vector2(0.5f, 1f);
                panelRect.anchorMax = new Vector2(0.5f, 1f);
                panelRect.pivot = new Vector2(0.5f, 1f);
                panelRect.anchoredPosition = new Vector2(0f, -84f);
                panelRect.sizeDelta = new Vector2(520f, 0f);

                var panelImage = panelGo.GetComponent<Image>();
                panelImage.sprite = UiSprites.Square;
                panelImage.color = new Color(0f, 0f, 0f, 0.55f);

                var layout = panelGo.GetComponent<VerticalLayoutGroup>();
                layout.spacing = 4f;
                layout.padding = new RectOffset(12, 12, 8, 8);
                layout.childForceExpandWidth = true;
                layout.childForceExpandHeight = false;
                layout.childControlHeight = false;

                var fitter = panelGo.GetComponent<ContentSizeFitter>();
                fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

                _tabContentRoots[tab] = panelGo.transform;
            }
        }

        private void BuildTabButton(Transform parent, Tab tab)
        {
            var buttonGo = new GameObject($"Tab_{tab}", typeof(RectTransform), typeof(Image), typeof(Button));
            buttonGo.transform.SetParent(parent, false);
            var image = buttonGo.GetComponent<Image>();
            image.sprite = UiSprites.Square;
            _tabButtonBackgrounds[tab] = image;

            buttonGo.GetComponent<Button>().onClick.AddListener(() => SetActiveTab(tab));

            var textGo = new GameObject("Label", typeof(RectTransform));
            textGo.transform.SetParent(buttonGo.transform, false);
            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 14;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.text = tab.ToString();
            var textRect = (RectTransform)textGo.transform;
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;
        }

        private void SetActiveTab(Tab tab)
        {
            _activeTab = tab;
            foreach (var (candidate, root) in _tabContentRoots)
            {
                root.gameObject.SetActive(candidate == tab);
                _tabButtonBackgrounds[candidate].color = candidate == tab ? new Color(0.6f, 0.5f, 0.1f) : new Color(0.3f, 0.3f, 0.3f);
            }
        }

        private void BuildHeader(Transform parent, string text)
        {
            var go = new GameObject("Header", typeof(RectTransform), typeof(LayoutElement));
            go.transform.SetParent(parent, false);
            go.GetComponent<LayoutElement>().preferredHeight = 22f;
            var label = go.AddComponent<Text>();
            label.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            label.fontSize = 16;
            label.fontStyle = FontStyle.Bold;
            label.color = new Color(1f, 0.85f, 0.4f);
            label.text = text;
        }

        private void BuildRow(Transform parent, string label, string buttonLabel = null, Action onClick = null, bool interactable = true)
        {
            var rowGo = new GameObject("Row", typeof(RectTransform), typeof(HorizontalLayoutGroup), typeof(LayoutElement));
            rowGo.transform.SetParent(parent, false);
            rowGo.GetComponent<LayoutElement>().preferredHeight = 26f;
            var rowLayout = rowGo.GetComponent<HorizontalLayoutGroup>();
            rowLayout.spacing = 8f;
            rowLayout.childForceExpandWidth = false;
            rowLayout.childAlignment = TextAnchor.MiddleLeft;

            var labelGo = new GameObject("Label", typeof(RectTransform), typeof(LayoutElement));
            labelGo.transform.SetParent(rowGo.transform, false);
            labelGo.GetComponent<LayoutElement>().preferredWidth = 400f;
            var labelText = labelGo.AddComponent<Text>();
            labelText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            labelText.fontSize = 14;
            labelText.color = Color.white;
            labelText.text = label;

            if (buttonLabel == null) return;

            var buttonGo = new GameObject("Button", typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
            buttonGo.transform.SetParent(rowGo.transform, false);
            buttonGo.GetComponent<LayoutElement>().preferredWidth = 90f;
            var buttonImage = buttonGo.GetComponent<Image>();
            buttonImage.sprite = UiSprites.Square;
            buttonImage.color = interactable ? new Color(0.2f, 0.45f, 0.2f) : new Color(0.25f, 0.25f, 0.25f);
            var button = buttonGo.GetComponent<Button>();
            button.interactable = interactable;
            if (onClick != null) button.onClick.AddListener(() => onClick());

            var buttonTextGo = new GameObject("Label", typeof(RectTransform));
            buttonTextGo.transform.SetParent(buttonGo.transform, false);
            var buttonText = buttonTextGo.AddComponent<Text>();
            buttonText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            buttonText.fontSize = 13;
            buttonText.alignment = TextAnchor.MiddleCenter;
            buttonText.color = Color.white;
            buttonText.text = buttonLabel;
            var buttonTextRect = (RectTransform)buttonTextGo.transform;
            buttonTextRect.anchorMin = Vector2.zero;
            buttonTextRect.anchorMax = Vector2.one;
            buttonTextRect.offsetMin = Vector2.zero;
            buttonTextRect.offsetMax = Vector2.zero;
        }

        private static void ClearChildren(Transform root)
        {
            foreach (Transform child in root)
            {
                Destroy(child.gameObject);
            }
        }
    }
}
