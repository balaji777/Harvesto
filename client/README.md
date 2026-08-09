# Harvesto Client (Phase 1-4, matching backend scope)

A real Unity 6 (2D URP) project — created via `Unity.exe -batchmode -createProject`,
patched with the same package set (URP 17.6.0, 2D sprite, Input System, Newtonsoft.Json)
as Unity Hub's official "2D (URP)" template, and verified to compile and run headlessly
against the [server](../server/README.md). See [GAME_DESIGN.md §9](../GAME_DESIGN.md#9-client-architecture-unity)
for the architecture this follows.

## Opening it

1. Unity Hub → **Open** (not New) → select this `client/` folder. Unity 6.5.2f1 is what it was built/tested against; Hub will offer to use whichever Unity 6.x you have installed.
2. Start the backend first ([`../server/README.md`](../server/README.md)) — the client talks to `http://localhost:3000/api` by default (configurable on the `GameBootstrap` component's **Api Base Url** field).
3. Open `Assets/Scenes/SampleScene.unity` (it's already the default/build-index-0 scene) and press **Play**.

What you'll see:

- A guest login happens automatically, then a 16×16 farm grid renders (dark + a lock icon = locked, brown = empty, green = growing, gold = ready), with a status readout in the top-left showing level/coins/diamonds/silo+barn.
- A seed-picker bar along the bottom lets you choose which crop taps plant (locked-by-level crops are dimmed, wheat/corn/carrot show a real icon — see "Art" below); a sell panel in the top-right lists both Silo and Barn contents with a **Sell** button per stack (items with a real icon show it). **Tap an empty tile to plant the selected seed; tap a ready (gold) tile to harvest it.**
- A tab bar top-center — **Buildings / Animals / Orders / Friends / Fishing / Cosmetics / Decorations / Achievements / Daily / Mailbox** — opens a panel over the grid covering everything from Phase 2 through Phase 4: buy pens/factories/animals, feed/craft/collect, fulfill truck/boat/train orders, send/accept friend requests and help/gift friends, cast/collect at the fishing lake, buy/equip cosmetics, buy decorations, browse achievements, claim your daily login bonus and missions, and clear out your mailbox. All plain text rows with buttons — no art yet.

This has been verified end-to-end with a headless Play-mode run (`Assets/_Project/Scripts/Editor/PlayModeSmokeTest.cs` — invoke via `-executeMethod Harvesto.EditorTools.PlayModeSmokeTest.Run`) confirming login, farm load (256 tiles), and every tab's full catalog loading with zero runtime exceptions against the live server (5 building types, 3 animal types, order tiers correctly empty below their level gates, 6 fish types, 13 cosmetics, 5 decorations, 15 achievements, 3 auto-assigned daily missions). That's not a substitute for actually playing it, though.

## What's implemented

| File | Purpose |
|---|---|
| `Networking/ApiClient.cs` | Thin `UnityWebRequest` wrapper — JSON in/out, bearer-token header, `async`/`await` via a `GetAwaiter` extension |
| `Domain/Models.cs` | Plain C# DTOs mirroring the server's response shapes |
| `Persistence/DeviceIdProvider.cs` | Generates/persists a stable per-install device id (`PlayerPrefs`) used for guest login |
| `Persistence/TokenStore.cs` | Persists access/refresh tokens locally (⚠️ `PlayerPrefs` is fine for dev; swap for platform secure storage before shipping) |
| `Services/AuthService.cs` | `LoginAsGuestAsync`, `RegisterAsync`, `LoginAsync`, `RefreshAsync`, `GetMeAsync` — auto-attaches the stored access token to `ApiClient` |
| `Services/FarmService.cs` | `GetFarmAsync`, `GetCropTypesAsync`, `PlantAsync(x, y, cropTypeId)`, `HarvestAsync(tileId)` |
| `Services/InventoryService.cs` | `GetInventoryAsync` (returns `{ silo, barn }`), `SellAsync(itemTypeId, quantity)` |
| `Services/EconomyService.cs` | `GetWalletAsync` |
| `Services/AnimalService.cs` | `GetAnimalTypesAsync`, `GetMyAnimalsAsync`, `BuyAsync`, `FeedAsync`, `CollectAsync` |
| `Services/BuildingService.cs` | `GetBuildingTypesAsync`, `GetRecipesAsync`, `GetMyBuildingsAsync`, `BuyAsync`, `CraftAsync`, `CollectAsync` |
| `Services/OrderService.cs` | `Get{Truck,Boat,Train}OrdersAsync`, `Fulfill{Truck,Boat,Train}Async`, plus a `FulfillAsync(OrderDto)` that routes by the order's own `source` |
| `Services/FriendService.cs` | `GetFriendsAsync`, `GetIncomingRequestsAsync`, `SendRequestAsync`, `AcceptAsync`, `DeclineAsync`, `RemoveAsync`, `ViewFriendFarmAsync`, `HelpAsync`, `GiftAsync` |
| `Services/FishingService.cs` | `GetFishTypesAsync`, `GetStatusAsync`, `CastAsync`, `CollectAsync` |
| `Services/CosmeticService.cs` | `GetTypesAsync`, `GetMineAsync`, `BuyAsync`, `EquipAsync` |
| `Services/DecorationService.cs` | `GetTypesAsync`, `GetMineAsync`, `BuyAsync`, `GetFarmValueAsync` |
| `Services/AchievementService.cs` | `GetDefinitionsAsync`, `GetMineAsync` |
| `Services/DailyService.cs` | `GetLoginBonusStatusAsync`, `ClaimLoginBonusAsync`, `GetMissionsAsync`, `ClaimMissionAsync` |
| `Services/MailboxService.cs` | `GetMailAsync`, `ClaimAsync`, `ClaimAllAsync` |
| `Core/GameBootstrap.cs` | App entry point — guest login, then hands all services to `FarmGridView` and `ProductionUI` |
| `UI/FarmGridView.cs` | Renders the grid from `GetFarmAsync()`, fits the camera, handles tap-to-plant/harvest via the new Input System, client-predicts growing→ready color locally off `readyAt`. Exposes `RefreshEconomyDisplaysAsync()` so other panels can trigger a wallet/silo/barn refresh after their own actions |
| `UI/FarmTileView.cs` | Per-tile visual state (locked/empty/growing/ready) |
| `UI/FarmHud.cs` | Runtime-built status readout — level/xp/coins/diamonds/silo/barn |
| `UI/FarmActionsUI.cs` | Bottom seed-picker bar (level-gated) and top-right sell panel (both Silo and Barn) |
| `UI/ProductionUI.cs` | 10-tab panel (Buildings/Animals/Orders/Friends/Fishing/Cosmetics/Decorations/Achievements/Daily/Mailbox) — buy, craft, feed, collect, fulfill, request/accept/help/gift, cast/collect, equip, claim |
| `UI/UiSprites.cs` | Shared runtime-generated placeholder square sprite, still used everywhere `ItemIconCatalog` doesn't have a real icon |
| `UI/ItemIconCatalog.cs` | Maps an itemTypeId (or a UI-only key like `"coins"`/`"diamonds"`/`"locked"`) to a real icon loaded from `Resources/Icons/`, or reports "no icon" so the caller keeps its flat color swatch |
| `Editor/IconImportSettings.cs` | `AssetPostprocessor` that forces everything under `Resources/Icons/` to import as a UI sprite (dropping files in via automation skips Unity's interactive import dialog that would normally set this) |
| `Editor/SceneSetup.cs` | `-executeMethod`-able tool that wires `GameBootstrap` into the sample scene |
| `Editor/PlayModeSmokeTest.cs` | `-executeMethod`-able headless Play-mode runner, useful for CI or a quick sanity check without opening the Editor GUI |

## Art

A first real-art pass, sourced from Kenney's CC0 (public domain, no attribution
required) packs — see `Assets/_Project/Resources/Icons/CREDITS.txt` for the
exact source file per icon:

- **Farm tiles** (`FarmTileView.cs`): a `LOCKED` tile now layers a real lock
  glyph on top of its color fill, instead of being color-only.
- **Crops with a real icon** (`ItemIconCatalog.cs`): `wheat`, `corn`,
  `carrot` — shown on the seed-picker buttons and inventory rows.
  Everything else (`soybean`, `indigo`, `sugarcane`, `cotton`, all animals/
  animal products, buildings, most recipes, fish species, cosmetics,
  decorations) has no icon yet and falls back to the existing flat color
  swatch/plain text row — this is a deliberate partial pass, not a full
  re-skin. `bread`/`cake`/`cheese`/`pie`/`egg`/`milk` icons exist in the
  catalog too (ready for whenever those get their own UI rows) but nothing
  currently renders them since `ProductionUI`'s building/recipe tabs are
  still text-only.
- **`ItemIconCatalog.TryGet`** is the extension point — add a Kenney (or any
  CC0) PNG to `Resources/Icons/`, add one line to the dictionary, done. No
  code elsewhere needs to change; callers already handle "no icon" gracefully.

## Known limitations

- **Most of the UI is still plain colored squares/text rows** — see "Art" above for the one real-art pass that exists so far (`ItemIconCatalog`). Everything not covered there still uses `UiSprites.Square`, a runtime-generated 1×1 texture.
- **Sell is all-or-nothing per stack**, decorations only buy one at a time (no quantity picker for either).
- **`ProductionUI` re-fetches and rebuilds every tab's lists on every action** rather than patching in place, and has no live countdown re-render (recipe/animal/order/fishing "ready in Xs" text is only as fresh as the last refresh) — fine for verification scope, worth revisiting once this is real UI.
- **Sending a friend request needs their raw user id**, pasted into a text field — there's no username search, friend code, or QR-style share flow. Matches the server, which has the same gap (see `server/README.md`).
- **Viewing a friend's farm just logs a summary to the Console** (tile/planted counts) rather than rendering their actual grid — a real read-only farm viewer would mean instantiating a second `FarmGridView`-like renderer, which is a bigger follow-up.
- **No offline action queue** (GAME_DESIGN.md §9.3) — actions taken without connectivity just fail; they aren't queued/replayed on reconnect yet.
- **The tab bar is getting crowded** — 10 tabs at 900px means small text (`fontSize 10`) and tight per-tab width. Worth collapsing into a menu/drawer once this becomes real UI instead of a flat bar.
- Google/Apple sign-in aren't wired up client-side (matches the server, which is guest/email-only).
