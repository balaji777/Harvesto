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
    /// Phase 2-4 economy/social panel: tabs for Buildings, Animals, Orders
    /// (truck/boat/train), Friends, Fishing, Cosmetics, and Decorations —
    /// buy/craft/collect/feed/fulfill/help/gift/cast/equip. Runtime-built
    /// uGUI, same no-imported-assets approach as the rest of the UI — this
    /// is functional placeholder UI, not final art or layout.
    /// </summary>
    public class ProductionUI : MonoBehaviour
    {
        private enum Tab { Buildings, Animals, Orders, Friends, Fishing, Cosmetics, Decorations, Achievements, Daily, Mailbox }

        private BuildingService _buildingService;
        private AnimalService _animalService;
        private OrderService _orderService;
        private FriendService _friendService;
        private FishingService _fishingService;
        private CosmeticService _cosmeticService;
        private DecorationService _decorationService;
        private AchievementService _achievementService;
        private DailyService _dailyService;
        private MailboxService _mailboxService;
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
        private List<OrderDto> _boatOrders;
        private List<OrderDto> _trainOrders;
        private List<FriendDto> _myFriends;
        private List<FriendRequestDto> _incomingRequests;
        private List<FishTypeDto> _fishTypes;
        private FishingStatusDto _fishingStatus;
        private List<CosmeticTypeDto> _cosmeticTypes;
        private MyCosmeticsDto _myCosmetics;
        private List<DecorationTypeDto> _decorationTypes;
        private List<PlayerDecorationDto> _myDecorations;
        private int _farmValue;
        private List<AchievementDefinitionDto> _achievementDefinitions;
        private List<PlayerAchievementDto> _myAchievements;
        private LoginBonusStatusDto _loginBonusStatus;
        private List<DailyMissionProgressDto> _dailyMissions;
        private List<MailItemDto> _mail;

        private InputField _friendRequestInput;

        public void Initialize(
            BuildingService buildingService,
            AnimalService animalService,
            OrderService orderService,
            FriendService friendService,
            FishingService fishingService,
            CosmeticService cosmeticService,
            DecorationService decorationService,
            AchievementService achievementService,
            DailyService dailyService,
            MailboxService mailboxService,
            Func<Task> onEconomyChanged)
        {
            _buildingService = buildingService;
            _animalService = animalService;
            _orderService = orderService;
            _friendService = friendService;
            _fishingService = fishingService;
            _cosmeticService = cosmeticService;
            _decorationService = decorationService;
            _achievementService = achievementService;
            _dailyService = dailyService;
            _mailboxService = mailboxService;
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
            _boatOrders = await _orderService.GetBoatOrdersAsync();
            _trainOrders = await _orderService.GetTrainOrdersAsync();
            _myFriends = await _friendService.GetFriendsAsync();
            _incomingRequests = await _friendService.GetIncomingRequestsAsync();
            _fishTypes = await _fishingService.GetFishTypesAsync();
            _fishingStatus = await _fishingService.GetStatusAsync();
            _cosmeticTypes = await _cosmeticService.GetTypesAsync();
            _myCosmetics = await _cosmeticService.GetMineAsync();
            _decorationTypes = await _decorationService.GetTypesAsync();
            _myDecorations = await _decorationService.GetMineAsync();
            _farmValue = (await _decorationService.GetFarmValueAsync()).farmValue;
            _achievementDefinitions = await _achievementService.GetDefinitionsAsync();
            _myAchievements = await _achievementService.GetMineAsync();
            _loginBonusStatus = await _dailyService.GetLoginBonusStatusAsync();
            _dailyMissions = await _dailyService.GetMissionsAsync();
            _mail = await _mailboxService.GetMailAsync();

            RenderBuildingsTab();
            RenderAnimalsTab();
            RenderOrdersTab();
            RenderFriendsTab();
            RenderFishingTab();
            RenderCosmeticsTab();
            RenderDecorationsTab();
            RenderAchievementsTab();
            RenderDailyTab();
            RenderMailboxTab();

            Debug.Log($"[Harvesto] Production UI ready: {_buildingTypes.Count} building types, {_animalTypes.Count} animal types, " +
                      $"{_truckOrders.Count}/{_boatOrders.Count}/{_trainOrders.Count} truck/boat/train orders, {_myFriends.Count} friends, " +
                      $"{_fishTypes.Count} fish types, {_cosmeticTypes.Count} cosmetics, {_decorationTypes.Count} decorations, farm value {_farmValue}, " +
                      $"{_achievementDefinitions.Count} achievements ({_myAchievements.Count} unlocked), {_dailyMissions.Count} daily missions, {_mail.Count} mail items.");
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

            RenderOrderSection(root, "Truck orders", _truckOrders);
            RenderOrderSection(root, "Boat orders (unlocks lvl 5)", _boatOrders);
            RenderOrderSection(root, "Train orders (unlocks lvl 10)", _trainOrders);
        }

        private void RenderOrderSection(Transform root, string headerText, List<OrderDto> orders)
        {
            BuildHeader(root, headerText);
            if (orders.Count == 0)
            {
                BuildRow(root, "(none active — check back later, or level up)");
                return;
            }

            foreach (var order in orders)
            {
                var requirements = string.Join(", ", order.requirements.Select(r => $"{r.quantity}x {r.itemTypeId}"));
                var reward = order.rewardDiamonds > 0
                    ? $"{order.rewardCoins}c, {order.rewardDiamonds} diamonds, {order.rewardXp}xp"
                    : $"{order.rewardCoins}c, {order.rewardXp}xp";
                BuildRow(root, $"Need {requirements} — reward {reward}", "Fulfill", () => Fulfill(order));
            }
        }

        // --- Friends tab -----------------------------------------------------

        private void RenderFriendsTab()
        {
            var root = _tabContentRoots[Tab.Friends];
            ClearChildren(root);

            BuildHeader(root, "Add a friend (paste their user id)");
            BuildInputRow(root, out _friendRequestInput, "Send Request", SendFriendRequest);

            BuildHeader(root, "Incoming requests");
            if (_incomingRequests.Count == 0) BuildRow(root, "(none)");
            foreach (var request in _incomingRequests)
            {
                BuildRow(root, $"{request.requester.username} wants to be friends", "Accept", () => AcceptFriend(request.id));
                BuildRow(root, "", "Decline", () => DeclineFriend(request.id));
            }

            BuildHeader(root, "Your friends");
            if (_myFriends.Count == 0) BuildRow(root, "(none yet)");
            foreach (var friend in _myFriends)
            {
                BuildRow(root, $"{friend.username} (lvl {friend.level})", "View farm", () => ViewFriendFarm(friend.userId));
                BuildRow(root, "", "Help", () => HelpFriend(friend.userId));
                BuildRow(root, "", "Gift", () => GiftFriend(friend.userId));
                BuildRow(root, "", "Remove", () => RemoveFriend(friend.friendshipId));
            }
        }

        // --- Fishing tab -------------------------------------------------------

        private void RenderFishingTab()
        {
            var root = _tabContentRoots[Tab.Fishing];
            ClearChildren(root);

            BuildHeader(root, "Fishing Lake");
            if (!_fishingStatus.isCasting)
            {
                BuildRow(root, "No line in the water", "Cast", CastFishing);
            }
            else if (_fishingStatus.isReady)
            {
                BuildRow(root, "Something's biting!", "Collect", CollectFishing);
            }
            else
            {
                var remaining = (_fishingStatus.castReadyAt.Value - DateTime.UtcNow).TotalSeconds;
                BuildRow(root, $"Waiting for a bite... ready in {remaining:0}s");
            }

            BuildHeader(root, "Fish catalog");
            foreach (var fish in _fishTypes)
            {
                BuildRow(root, $"{fish.name} — sells {fish.sellPriceCoins}c, unlocks lvl {fish.unlockLevel}");
            }
        }

        // --- Cosmetics tab ----------------------------------------------------

        private void RenderCosmeticsTab()
        {
            var root = _tabContentRoots[Tab.Cosmetics];
            ClearChildren(root);

            var equippedByCategory = _myCosmetics.equipped.ToDictionary(e => e.category, e => e.cosmeticTypeId);
            var ownedIds = _myCosmetics.owned.Select(o => o.cosmeticTypeId).ToHashSet();

            foreach (var group in _cosmeticTypes.GroupBy(c => c.category))
            {
                BuildHeader(root, group.Key);
                foreach (var cosmetic in group)
                {
                    var owned = ownedIds.Contains(cosmetic.id);
                    var isEquipped = equippedByCategory.TryGetValue(cosmetic.category, out var equippedId) && equippedId == cosmetic.id;
                    var costLabel = cosmetic.purchaseCostCoins > 0 ? $"{cosmetic.purchaseCostCoins}c" : "free";
                    var label = $"{cosmetic.name} — {costLabel}, unlocks lvl {cosmetic.unlockLevel}" + (isEquipped ? " [worn]" : "");

                    if (!owned)
                    {
                        BuildRow(root, label, "Buy", () => BuyCosmetic(cosmetic.id));
                    }
                    else if (!isEquipped)
                    {
                        BuildRow(root, label, "Equip", () => EquipCosmetic(cosmetic.id));
                    }
                    else
                    {
                        BuildRow(root, label);
                    }
                }
            }
        }

        // --- Decorations tab ---------------------------------------------------

        private void RenderDecorationsTab()
        {
            var root = _tabContentRoots[Tab.Decorations];
            ClearChildren(root);

            BuildHeader(root, $"Farm value: {_farmValue}");
            foreach (var decoration in _decorationTypes)
            {
                var owned = _myDecorations.FirstOrDefault(d => d.decorationTypeId == decoration.id);
                var label = $"{decoration.name} — {decoration.purchaseCostCoins}c, unlocks lvl {decoration.unlockLevel}, +{decoration.farmValueBonus} value" +
                            (owned != null ? $" (own {owned.quantity})" : "");
                BuildRow(root, label, "Buy 1", () => BuyDecoration(decoration.id));
            }
        }

        // --- Achievements tab --------------------------------------------------

        private void RenderAchievementsTab()
        {
            var root = _tabContentRoots[Tab.Achievements];
            ClearChildren(root);

            var unlockedIds = _myAchievements.Select(a => a.achievementDefinitionId).ToHashSet();

            foreach (var group in _achievementDefinitions.GroupBy(a => a.category))
            {
                BuildHeader(root, group.Key);
                foreach (var achievement in group)
                {
                    var unlocked = unlockedIds.Contains(achievement.id);
                    var status = unlocked ? "[unlocked]" : $"target: {achievement.targetValue}";
                    var reward = $"{achievement.rewardCoins}c" + (achievement.rewardDiamonds > 0 ? $", {achievement.rewardDiamonds} diamonds" : "") + $", {achievement.rewardXp}xp";
                    BuildRow(root, $"[{achievement.tier}] {achievement.name} — {achievement.description} ({status}, reward {reward})");
                }
            }
        }

        // --- Daily tab (login bonus + missions) ---------------------------------

        private void RenderDailyTab()
        {
            var root = _tabContentRoots[Tab.Daily];
            ClearChildren(root);

            BuildHeader(root, $"Login streak: {_loginBonusStatus.streak} days");
            BuildRow(root, _loginBonusStatus.canClaimToday ? "Today's bonus is ready!" : "Already claimed today",
                _loginBonusStatus.canClaimToday ? "Claim" : null,
                _loginBonusStatus.canClaimToday ? ClaimLoginBonus : (Action)null,
                _loginBonusStatus.canClaimToday);

            BuildHeader(root, "Today's missions");
            if (_dailyMissions.Count == 0) BuildRow(root, "(none assigned — check back after refresh)");
            foreach (var mission in _dailyMissions)
            {
                var progressLabel = $"{mission.description} — {mission.progress}/{mission.targetValue}, reward {mission.rewardCoins}c, {mission.rewardXp}xp";
                if (mission.claimedAt.HasValue)
                {
                    BuildRow(root, progressLabel + " [claimed]");
                }
                else if (mission.isComplete)
                {
                    BuildRow(root, progressLabel, "Claim", () => ClaimMission(mission.id));
                }
                else
                {
                    BuildRow(root, progressLabel);
                }
            }
        }

        // --- Mailbox tab ---------------------------------------------------------

        private void RenderMailboxTab()
        {
            var root = _tabContentRoots[Tab.Mailbox];
            ClearChildren(root);

            var unclaimedCount = _mail.Count(m => !m.claimedAt.HasValue);
            BuildHeader(root, $"Mailbox ({unclaimedCount} unclaimed)");
            if (unclaimedCount > 0)
            {
                BuildRow(root, "Claim everything at once", "Claim All", ClaimAllMail);
            }

            if (_mail.Count == 0) BuildRow(root, "(empty)");
            foreach (var mail in _mail)
            {
                var reward = $"{mail.rewardCoins}c" + (mail.rewardDiamonds > 0 ? $", {mail.rewardDiamonds} diamonds" : "") + (mail.rewardXp > 0 ? $", {mail.rewardXp}xp" : "");
                var label = $"{mail.message} ({reward})";
                if (mail.claimedAt.HasValue)
                {
                    BuildRow(root, label + " [claimed]");
                }
                else
                {
                    BuildRow(root, label, "Claim", () => ClaimMail(mail.id));
                }
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

        private async void Fulfill(OrderDto order)
        {
            await RunAction(() => _orderService.FulfillAsync(order), "fulfill order");
        }

        private async void SendFriendRequest()
        {
            var targetUserId = _friendRequestInput.text.Trim();
            if (string.IsNullOrEmpty(targetUserId)) return;

            await RunAction(() => _friendService.SendRequestAsync(targetUserId), "send friend request");
            _friendRequestInput.text = string.Empty;
        }

        private async void AcceptFriend(string friendshipId)
        {
            await RunAction(() => _friendService.AcceptAsync(friendshipId), "accept friend request");
        }

        private async void DeclineFriend(string friendshipId)
        {
            await RunAction(() => _friendService.DeclineAsync(friendshipId), "decline friend request");
        }

        private async void RemoveFriend(string friendshipId)
        {
            await RunAction(() => _friendService.RemoveAsync(friendshipId), "remove friend");
        }

        private async void HelpFriend(string friendId)
        {
            await RunAction(() => _friendService.HelpAsync(friendId), "help friend");
        }

        private async void GiftFriend(string friendId)
        {
            await RunAction(() => _friendService.GiftAsync(friendId), "gift friend");
        }

        /// <summary>No mini farm-view UI yet — logs a summary instead. See client/README.md.</summary>
        private async void ViewFriendFarm(string friendId)
        {
            try
            {
                var farm = await _friendService.ViewFriendFarmAsync(friendId);
                var planted = farm.tiles.Count(t => t.plantedCrop != null);
                _statusText.text = $"{farm.tiles.Count} tiles, {planted} planted (see Console for details)";
                Debug.Log($"[Harvesto] Friend's farm ({friendId}): {farm.gridWidth}x{farm.gridHeight}, {planted} planted crops.");
            }
            catch (ApiException ex)
            {
                _statusText.text = $"Couldn't view farm: {ex.Message}";
            }
        }

        private async void CastFishing()
        {
            await RunAction(() => _fishingService.CastAsync(), "cast a line");
        }

        private async void CollectFishing()
        {
            await RunAction(() => _fishingService.CollectAsync(), "collect the catch");
        }

        private async void BuyCosmetic(string cosmeticTypeId)
        {
            await RunAction(() => _cosmeticService.BuyAsync(cosmeticTypeId), "buy cosmetic");
        }

        private async void EquipCosmetic(string cosmeticTypeId)
        {
            await RunAction(() => _cosmeticService.EquipAsync(cosmeticTypeId), "equip cosmetic");
        }

        private async void BuyDecoration(string decorationTypeId)
        {
            await RunAction(() => _decorationService.BuyAsync(decorationTypeId, 1), "buy decoration");
        }

        private async void ClaimLoginBonus()
        {
            await RunAction(() => _dailyService.ClaimLoginBonusAsync(), "claim login bonus");
        }

        private async void ClaimMission(string assignmentId)
        {
            await RunAction(() => _dailyService.ClaimMissionAsync(assignmentId), "claim mission");
        }

        private async void ClaimMail(string mailItemId)
        {
            await RunAction(() => _mailboxService.ClaimAsync(mailItemId), "claim mail");
        }

        private async void ClaimAllMail()
        {
            await RunAction(() => _mailboxService.ClaimAllAsync(), "claim all mail");
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
            tabBarRect.sizeDelta = new Vector2(900f, 32f);
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
            text.fontSize = 10;
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

        private void BuildInputRow(Transform parent, out InputField inputField, string buttonLabel, Action onSubmit)
        {
            var rowGo = new GameObject("InputRow", typeof(RectTransform), typeof(HorizontalLayoutGroup), typeof(LayoutElement));
            rowGo.transform.SetParent(parent, false);
            rowGo.GetComponent<LayoutElement>().preferredHeight = 26f;
            var rowLayout = rowGo.GetComponent<HorizontalLayoutGroup>();
            rowLayout.spacing = 8f;
            rowLayout.childForceExpandWidth = false;
            rowLayout.childAlignment = TextAnchor.MiddleLeft;

            var fieldGo = new GameObject("Input", typeof(RectTransform), typeof(Image), typeof(InputField), typeof(LayoutElement));
            fieldGo.transform.SetParent(rowGo.transform, false);
            fieldGo.GetComponent<LayoutElement>().preferredWidth = 400f;
            fieldGo.GetComponent<Image>().color = new Color(0.15f, 0.15f, 0.15f);

            var textGo = new GameObject("Text", typeof(RectTransform));
            textGo.transform.SetParent(fieldGo.transform, false);
            var text = textGo.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 13;
            text.color = Color.white;
            text.supportRichText = false;
            var textRect = (RectTransform)textGo.transform;
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = new Vector2(6, 2);
            textRect.offsetMax = new Vector2(-6, -2);

            var placeholderGo = new GameObject("Placeholder", typeof(RectTransform));
            placeholderGo.transform.SetParent(fieldGo.transform, false);
            var placeholder = placeholderGo.AddComponent<Text>();
            placeholder.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            placeholder.fontSize = 13;
            placeholder.fontStyle = FontStyle.Italic;
            placeholder.color = new Color(1f, 1f, 1f, 0.4f);
            placeholder.text = "target user id...";
            var placeholderRect = (RectTransform)placeholderGo.transform;
            placeholderRect.anchorMin = Vector2.zero;
            placeholderRect.anchorMax = Vector2.one;
            placeholderRect.offsetMin = new Vector2(6, 2);
            placeholderRect.offsetMax = new Vector2(-6, -2);

            inputField = fieldGo.GetComponent<InputField>();
            inputField.textComponent = text;
            inputField.placeholder = placeholder;

            var buttonGo = new GameObject("Button", typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
            buttonGo.transform.SetParent(rowGo.transform, false);
            buttonGo.GetComponent<LayoutElement>().preferredWidth = 120f;
            buttonGo.GetComponent<Image>().sprite = UiSprites.Square;
            buttonGo.GetComponent<Image>().color = new Color(0.2f, 0.45f, 0.2f);
            buttonGo.GetComponent<Button>().onClick.AddListener(() => onSubmit());

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
