# Harvesto Client (Phase 1 + Phase 2)

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

- A guest login happens automatically, then a 16×16 farm grid renders (dark = locked, brown = empty, green = growing, gold = ready), with a status readout in the top-left showing level/coins/diamonds/silo+barn.
- A seed-picker bar along the bottom lets you choose which crop taps plant (locked-by-level crops are dimmed); a sell panel in the top-right lists both Silo and Barn contents with a **Sell** button per stack. **Tap an empty tile to plant the selected seed; tap a ready (gold) tile to harvest it.**
- A **Buildings / Animals / Orders** tab bar top-center (Phase 2) opens a panel over the grid: buy pens/factories and animals, feed animals and craft recipes, collect finished products, and fulfill auto-generated truck orders — all as plain text rows with buttons (no art yet).

This has been verified end-to-end with a headless Play-mode run (`Assets/_Project/Scripts/Editor/PlayModeSmokeTest.cs` — invoke via `-executeMethod Harvesto.EditorTools.PlayModeSmokeTest.Run`) confirming login, farm load (256 tiles), and the production panel loading its full catalog (5 building types, 3 animal types, 3 truck orders) with zero runtime exceptions against the live server. That's not a substitute for actually playing it, though.

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
| `Services/OrderService.cs` | `GetTruckOrdersAsync`, `FulfillAsync` |
| `Core/GameBootstrap.cs` | App entry point — guest login, then hands services to `FarmGridView` and `ProductionUI` |
| `UI/FarmGridView.cs` | Renders the grid from `GetFarmAsync()`, fits the camera, handles tap-to-plant/harvest via the new Input System, client-predicts growing→ready color locally off `readyAt`. Exposes `RefreshEconomyDisplaysAsync()` so other panels can trigger a wallet/silo/barn refresh after their own actions |
| `UI/FarmTileView.cs` | Per-tile visual state (locked/empty/growing/ready) |
| `UI/FarmHud.cs` | Runtime-built status readout — level/xp/coins/diamonds/silo/barn |
| `UI/FarmActionsUI.cs` | Bottom seed-picker bar (level-gated) and top-right sell panel (both Silo and Barn) |
| `UI/ProductionUI.cs` | Phase 2 tabbed panel (Buildings/Animals/Orders) — buy, craft, feed, collect, fulfill |
| `UI/UiSprites.cs` | Shared runtime-generated placeholder square sprite used by every button/tile |
| `Editor/SceneSetup.cs` | `-executeMethod`-able tool that wires `GameBootstrap` into the sample scene |
| `Editor/PlayModeSmokeTest.cs` | `-executeMethod`-able headless Play-mode runner, useful for CI or a quick sanity check without opening the Editor GUI |

## Known limitations

- **Everything is plain colored squares/text rows** — no imported art yet (`UiSprites.Square` is a runtime-generated 1×1 texture). Swap in real tile/crop/building/animal/UI art when it exists.
- **Sell is all-or-nothing per stack** — no quantity picker.
- **`ProductionUI` re-fetches and rebuilds all three tabs' lists on every action** rather than patching in place, and has no live countdown re-render (recipe/animal "ready in Xs" text is only as fresh as the last refresh) — fine for Phase 2's verification scope, worth revisiting once this is real UI.
- **No offline action queue** (GAME_DESIGN.md §9.3) — actions taken without connectivity just fail; they aren't queued/replayed on reconnect yet.
- Google/Apple sign-in aren't wired up client-side (matches the server, which is guest/email-only).
