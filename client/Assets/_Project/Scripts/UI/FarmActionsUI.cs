using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Services;
using UnityEngine;
using UnityEngine.UI;

namespace Harvesto.UI
{
    /// <summary>
    /// Bottom seed-picker row (choose what tapping an empty tile plants) and
    /// top-right inventory/sell panel. Runtime-built uGUI, same
    /// no-imported-assets approach as FarmHud — placeholder, not final art.
    /// </summary>
    public class FarmActionsUI : MonoBehaviour
    {
        private static readonly Color LockedButtonColor = new Color(0.2f, 0.2f, 0.2f);
        private static readonly Color UnlockedButtonColor = new Color(0.35f, 0.35f, 0.35f);
        private static readonly Color SelectedButtonColor = new Color(0.6f, 0.5f, 0.1f);

        public string SelectedCropTypeId { get; private set; }

        private InventoryService _inventoryService;
        private Func<Task> _onWalletChanged;
        private List<CropTypeDto> _cropTypes;
        private int _playerLevel;

        private readonly Dictionary<string, Image> _seedButtonBackgrounds = new();
        private Transform _inventoryListRoot;
        private Text _inventoryEmptyLabel;

        public void Initialize(List<CropTypeDto> cropTypes, int playerLevel, InventoryService inventoryService, Func<Task> onWalletChanged)
        {
            _cropTypes = cropTypes.OrderBy(c => c.sortOrder).ToList();
            _inventoryService = inventoryService;
            _onWalletChanged = onWalletChanged;
            SelectedCropTypeId = _cropTypes.First(c => c.unlockLevel <= playerLevel).id;

            BuildSeedBar();
            BuildInventoryPanel();
            SetPlayerLevel(playerLevel);
            _ = RefreshInventoryAsync();
        }

        public void SetPlayerLevel(int level)
        {
            _playerLevel = level;
            foreach (var cropType in _cropTypes)
            {
                var unlocked = cropType.unlockLevel <= level;
                var isSelected = cropType.id == SelectedCropTypeId;
                _seedButtonBackgrounds[cropType.id].color = isSelected ? SelectedButtonColor : unlocked ? UnlockedButtonColor : LockedButtonColor;
            }
        }

        public async Task RefreshInventoryAsync()
        {
            foreach (Transform child in _inventoryListRoot)
            {
                Destroy(child.gameObject);
            }

            var inventory = await _inventoryService.GetInventoryAsync();
            var items = inventory.silo.items.Concat(inventory.barn.items).Where(i => i.quantity > 0).ToList();
            _inventoryEmptyLabel.gameObject.SetActive(items.Count == 0);

            foreach (var item in items)
            {
                BuildInventoryRow(item.itemTypeId, item.quantity);
            }
        }

        private void SelectCrop(string cropTypeId)
        {
            var cropType = _cropTypes.First(c => c.id == cropTypeId);
            if (cropType.unlockLevel > _playerLevel) return;

            SelectedCropTypeId = cropTypeId;
            SetPlayerLevel(_playerLevel);
        }

        private async void SellStack(string itemTypeId, int quantity)
        {
            await _inventoryService.SellAsync(itemTypeId, quantity);
            await RefreshInventoryAsync();
            if (_onWalletChanged != null) await _onWalletChanged();
        }

        private void BuildSeedBar()
        {
            var canvasGo = new GameObject("SeedBarCanvas");
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGo.AddComponent<CanvasScaler>();
            canvasGo.AddComponent<GraphicRaycaster>();

            var barGo = new GameObject("SeedBar", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            barGo.transform.SetParent(canvasGo.transform, false);
            var barRect = (RectTransform)barGo.transform;
            barRect.anchorMin = new Vector2(0f, 0f);
            barRect.anchorMax = new Vector2(1f, 0f);
            barRect.pivot = new Vector2(0.5f, 0f);
            barRect.anchoredPosition = new Vector2(0f, 16f);
            barRect.sizeDelta = new Vector2(-32f, 64f);

            var layout = barGo.GetComponent<HorizontalLayoutGroup>();
            layout.spacing = 8f;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = true;
            layout.childAlignment = TextAnchor.MiddleCenter;

            foreach (var cropType in _cropTypes)
            {
                BuildSeedButton(barGo.transform, cropType);
            }
        }

        private void BuildSeedButton(Transform parent, CropTypeDto cropType)
        {
            var buttonGo = new GameObject($"Seed_{cropType.id}", typeof(RectTransform), typeof(Image), typeof(Button));
            buttonGo.transform.SetParent(parent, false);

            var image = buttonGo.GetComponent<Image>();
            image.sprite = UiSprites.Square;
            image.type = Image.Type.Simple;
            _seedButtonBackgrounds[cropType.id] = image;

            var button = buttonGo.GetComponent<Button>();
            button.onClick.AddListener(() => SelectCrop(cropType.id));

            var textGo = new GameObject("Label", typeof(RectTransform));
            textGo.transform.SetParent(buttonGo.transform, false);
            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 14;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.text = cropType.unlockLevel > 1 ? $"{cropType.name}\n(Lvl {cropType.unlockLevel})" : cropType.name;
            var textRect = (RectTransform)textGo.transform;
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;
        }

        private void BuildInventoryPanel()
        {
            var canvasGo = new GameObject("InventoryCanvas");
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGo.AddComponent<CanvasScaler>();
            canvasGo.AddComponent<GraphicRaycaster>();

            var panelGo = new GameObject("InventoryPanel", typeof(RectTransform), typeof(VerticalLayoutGroup));
            panelGo.transform.SetParent(canvasGo.transform, false);
            var panelRect = (RectTransform)panelGo.transform;
            panelRect.anchorMin = new Vector2(1f, 1f);
            panelRect.anchorMax = new Vector2(1f, 1f);
            panelRect.pivot = new Vector2(1f, 1f);
            panelRect.anchoredPosition = new Vector2(-16f, -16f);
            panelRect.sizeDelta = new Vector2(280f, 300f);

            var layout = panelGo.GetComponent<VerticalLayoutGroup>();
            layout.spacing = 4f;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;
            layout.childControlHeight = false;

            _inventoryListRoot = panelGo.transform;

            var emptyGo = new GameObject("EmptyLabel");
            emptyGo.transform.SetParent(_inventoryListRoot, false);
            _inventoryEmptyLabel = emptyGo.AddComponent<Text>();
            _inventoryEmptyLabel.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            _inventoryEmptyLabel.fontSize = 16;
            _inventoryEmptyLabel.color = Color.white;
            _inventoryEmptyLabel.text = "Silo is empty";
            var emptyRect = (RectTransform)emptyGo.transform;
            emptyRect.sizeDelta = new Vector2(280f, 24f);
        }

        private void BuildInventoryRow(string itemTypeId, int quantity)
        {
            var rowGo = new GameObject($"Row_{itemTypeId}", typeof(RectTransform), typeof(HorizontalLayoutGroup));
            rowGo.transform.SetParent(_inventoryListRoot, false);
            ((RectTransform)rowGo.transform).sizeDelta = new Vector2(280f, 28f);
            var rowLayout = rowGo.GetComponent<HorizontalLayoutGroup>();
            rowLayout.childForceExpandWidth = false;
            rowLayout.spacing = 8f;

            var labelGo = new GameObject("Label", typeof(RectTransform), typeof(LayoutElement));
            labelGo.transform.SetParent(rowGo.transform, false);
            labelGo.GetComponent<LayoutElement>().preferredWidth = 180f;
            var label = labelGo.AddComponent<Text>();
            label.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            label.fontSize = 16;
            label.color = Color.white;
            label.text = $"{quantity}x {itemTypeId}";

            var sellButtonGo = new GameObject("SellButton", typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
            sellButtonGo.transform.SetParent(rowGo.transform, false);
            sellButtonGo.GetComponent<LayoutElement>().preferredWidth = 80f;
            sellButtonGo.GetComponent<Image>().sprite = UiSprites.Square;
            sellButtonGo.GetComponent<Image>().color = new Color(0.2f, 0.45f, 0.2f);
            sellButtonGo.GetComponent<Button>().onClick.AddListener(() => SellStack(itemTypeId, quantity));

            var sellTextGo = new GameObject("Label", typeof(RectTransform));
            sellTextGo.transform.SetParent(sellButtonGo.transform, false);
            var sellText = sellTextGo.AddComponent<Text>();
            sellText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            sellText.fontSize = 14;
            sellText.alignment = TextAnchor.MiddleCenter;
            sellText.color = Color.white;
            sellText.text = "Sell";
            var sellTextRect = (RectTransform)sellTextGo.transform;
            sellTextRect.anchorMin = Vector2.zero;
            sellTextRect.anchorMax = Vector2.one;
            sellTextRect.offsetMin = Vector2.zero;
            sellTextRect.offsetMax = Vector2.zero;
        }
    }
}
