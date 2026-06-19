# AGENTS.md — The Starwarden Technical Reference

This document describes the **current** architecture, game logic, and conventions for **The Starwarden**, a Phaser + React project (repo folder: `wizard`). Read this before editing game code.

## Quick summary

- **Game name:** The Starwarden (browser title in `index.html`; story/instructions screens use the name in UI copy)
- **Stack:** Phaser 4, React 19, TypeScript, Vite
- **Genre:** 2D side-scrolling platformer — collect starlights to push the sky back from 50% darkness to clear
- **Main gameplay file:** `src/game/scenes/Game.ts`
- **World width:** 6480px (fixed; viewport is 1280×960)
- **Dev entry:** Preloader starts `Story`, then `Instructions`, then `Game` (skips MainMenu)

---

## Project structure

```
src/
  main.tsx                 # React bootstrap
  App.tsx                  # React UI shell (mounts PhaserGame)
  PhaserGame.tsx           # Creates/destroys Phaser game, listens to EventBus
    game/
    main.ts                # Phaser Game config (resolution, physics, scene list)
    debug.ts               # Debug flags (physics, world grid)
    EventBus.ts            # Phaser Events.EventEmitter for React ↔ Phaser
    world/
      worldMap.ts          # 135×40 tile grid (0/1), platform layout
      platformLayer.ts     # Batched TilemapLayer from world grid + collision
      starlightSpawns.ts   # Starlight spawn positions from platform runs
      murklingSpawns.ts    # Murkling spawn positions from platform runs
    starlightConfig.ts     # Darkness timer + starlight placement tuning
    starlightAnimations.ts # Starlight idle + collect tweens
    baddiesConfig.ts       # Murkling patrol, hit, and spawn tuning
    wizardCombatConfig.ts  # Attack animation + fireball tuning
    scenes/
      Boot.ts              # Loads minimal assets, → Preloader
      Preloader.ts         # Loads game assets + registers animations
      Story.ts           # Opening narrative before Instructions
      Instructions.ts      # How-to-play screen before Game
      MainMenu.ts          # Template menu (logo tween demo)
      Game.ts              # Core gameplay scene
      GameOver.ts          # Game over screen

public/assets/
  background/              # Parallax layers 1–4 (+ orig reference)
  platform/tiles/          # Platform tile images (only 11.png loaded in game)
  platform/spring_.png     # Legacy spritesheet (not used)
  wizard/                  # Character spritesheet + source frames (rebuild sheet via scripts/build-wizard-sheet.sh)
  murkling/                  # Murkling spritesheet + source strips (rebuild sheet via scripts/build-murkling-sheet.sh)
  loading.jpg, logo.png, star.png
  starlight/               # Starlight collectible (stars.png, 48×48)
```

---

## Scene flow

```mermaid
flowchart LR
    Boot --> Preloader
    Preloader --> Story
    Story --> Instructions
    Instructions --> Game
    MainMenu --> Game
    Game --> GameOver
    GameOver --> MainMenu
```

| Scene        | Key            | Role |
|-------------|----------------|------|
| Boot        | `Boot`         | Loads `loading.jpg` (1280×960) for preloader splash |
| Preloader   | `Preloader`    | Loads all game assets, creates animations |
| Story | `Story` | Opening narrative (2 pages); **Next** / **Continue** / Enter / Space → Instructions |
| Instructions| `Instructions` | How-to-play screen; **Start Game** / Enter / Space → Game |
| MainMenu    | `MainMenu`     | Template UI; `changeScene()` → Game |
| Game        | `Game`         | Scrolling world, platform, wizard player |
| GameOver    | `GameOver`     | Template scene (unused in normal win/lose flow) |

**Note:** `Preloader.create()` calls `this.scene.start('Story')`. MainMenu is registered but not used on cold start. Pause **New Game** restarts `Game` directly (skips Story and Instructions).

Every scene that React needs to control must emit:

```ts
EventBus.emit('current-scene-ready', this);
```

at the end of `create()`.

---

## Phaser game config (`src/game/main.ts`)

| Setting | Value |
|---------|-------|
| Resolution | 1280 × 960 |
| Renderer | `AUTO` |
| Render | `antialias: true`, `pixelArt: false` |
| Scale | `FIT`, `CENTER_BOTH` |
| Parent DOM id | `game-container` |
| Background color | `#028af8` |
| Physics | Arcade, gravity `{ x: 0, y: 800 }` |
| Physics debug | `DEBUG_PHYSICS` from `src/game/debug.ts` |

---

## Debugging

### IDE (Cursor / VS Code)

- **Run and Debug** → **Debug in Chrome** — starts Vite (`npm run dev-nolog`) and attaches the debugger
- Set breakpoints in `.ts` files under `src/`; source maps enabled in `vite/config.dev.mjs`

### In-game (dev builds only)

Flags in `src/game/debug.ts` (URL query params override defaults):

| Flag | URL param | Default (dev) | Effect |
|------|-----------|---------------|--------|
| `DEBUG_PHYSICS` | `?physicsDebug=1` | off | Arcade body outlines |
| `DEBUG_WORLD_GRID` | `?worldGrid=1` | off | World-map grid + platform cell overlay |

Set any param to `0` or `false` to disable.

**Hotkeys** (Game scene, dev only):

| Key | Action |
|-----|--------|
| `P` | Toggle physics debug |
| `G` | Toggle world grid overlay |

---

## World & camera (`Game.ts`)

| Constant | Value | Meaning |
|----------|-------|---------|
| `WORLD_WIDTH` | 6480 | World width in pixels (`135 × 48`) |
| `WORLD_HEIGHT` | 960 | World height in pixels (`40 × 24`) |
| `WORLD_MAP_COLS` | 135 | Grid columns |
| `WORLD_MAP_ROWS` | 40 | Grid rows |
| `TILE_WIDTH` | 48 | Platform tile width |
| `TILE_HEIGHT` | 24 | Platform tile height |
| `BACKGROUND_SCROLL_FACTORS` | 0.1, 0.25, 0.45, 0.65 | Parallax per bg layer |

Defined in `src/game/world/worldMap.ts`. `Game.ts` imports `WORLD_WIDTH` from there.

- `physics.world.setBounds` and `cameras.main.setBounds` match world width
- Camera follows player horizontally (`startFollow`, lerp `1` on X — locked to player)
- `cameras.main.roundPixels = false` — subpixel scroll for smoother motion with filtered sprites
- Player starts at `x: 80` on the platform surface
- `setCollideWorldBounds(true)` — player cannot leave world horizontally

---

## Platform

- **Layout:** `worldMap` in `src/game/world/worldMap.ts` — row-major `135 × 40` grid
 - `worldMap[row][col]`: `0` = empty, `1` = platform tile, `2` = tree1, `4` = tree2 (air row above platform)
 - Bottom row (row 39) filled with `1` (full ground)
 - Floating platforms are built as **connected climbable structures** (towers/staircases), not scattered segments
- **Tile size:** 48×24px (`platform-tile-11`, texture used 1:1)
- **Rendering:** single batched `TilemapLayer` via `createPlatformLayer()` in `platformLayer.ts` (cell `1` tiles); tree sprites for cell `2`/`4` in the row above, feet on `tileSurfaceY(platformRow)`
- **Collision:** arcade collider on the tilemap layer (tile index `0`); trees are decorative

### Generation (`createDefaultWorldMap`)

Structures are placed left→right across the world, separated by `MIN_STRUCTURE_GAP`–`MAX_STRUCTURE_GAP` empty columns (ground connects them).

| Constant | Value | Meaning |
|----------|-------|---------|
| `TIER_ROW_STEP` | 4 | Rows between stacked tiers (96px < walk-jump apex ~120px) |
| `MAX_STRUCTURE_TIERS` | 6 | Tallest staircase (in tiers); kept low to limit tile count |
| `MIN_RUN_LENGTH` / `MAX_RUN_LENGTH` | 3 / 5 | Platform run length bounds (≥3 ⇒ can host a starlight) |
| `MIN_STEP_GAP` / `MAX_STEP_GAP` | 2 / 3 | Empty cols between stacked tiers — the jump room |
| `MIN_STRUCTURE_GAP` / `MAX_STRUCTURE_GAP` | 6 / 14 | Empty columns between structures |

- `buildStructure()` builds an **up-and-over staircase**: each step goes up one tier *and* right by an empty `STEP_GAP`. A tier never sits directly over the one below, so the wizard always has clear sky to launch through and a side approach to land on — no unjumpable overhang. The gap (2–3 cols) is tuned to the wall-clearance math: ≥2 cols clears the platform's edge while rising 96px, ≤3 still lands on the upper run.
- Tier 1 is reachable from the continuous ground; each higher step is reachable from the step below ⇒ the whole staircase is climbable.
- Typical output: ~12–18 starlights, ~40–70 floating tiles per generation.

### Reachability guarantee

`worldMap.ts` runs a BFS (`computeReachableRuns`) from the ground run over a **conservative walk-jump model**, then `pruneUnreachableRuns()` clears any platform run not reachable. Because starlights/murklings only spawn on surviving runs, **every starlight is guaranteed collectible**.

| Constant | Value | Meaning |
|----------|-------|---------|
| `MAX_JUMP_UP_ROWS` | 4 | Max rows climbed in one jump |
| `MAX_GAP_FOR_RISE` | `[5,4,4,3,3]` | Max horizontal gap (cols) clearable per rise (rows) |
| `MAX_DROP_GAP` | 6 | Max horizontal gap when dropping/level |

To extend jump physics in `Game.ts`, keep these bounds in sync (or more conservative) so the BFS never accepts a jump the player can't make.

### Decorative trees (cell `2`)

| Constant | Value | Meaning |
|----------|-------|---------|
| `TREE_COUNT` | 4 | Trees placed per world |
| `CELL_TREE` | 2 | Tree type 1 (`tree1.png`) in air row above platform |
| `CELL_TREE_2` | 4 | Tree type 2 (`tree2.png`) in air row above platform |
| Tree width | 2×–4× `TILE_WIDTH` | Stored in `worldTreeScale[treeRow][col]` |

- **Sprites:** `tree1.png` → `tree-1`, `tree2.png` → `tree-2` (sources downscaled to **256px** long edge)
- **Grid layout:** tree cell at row `R`, platform at row `R + 1` (same `col`)
- **Placement:** 4 trees total — at least 1 on ground, spread evenly left→right across the world (not clustered at the start); no overlapping footprints
- **Rendering:** `getTreeTextureKey(cell)`; feet at `tileSurfaceY(platformRow)`

---

## Starlights & darkness

**Goal:** The sky starts at **50% darkness**. Collect starlights to push darkness down; reach **0%** to win. If darkness hits **100%**, you lose.

| Constant | Value | Meaning |
|----------|-------|---------|
| `DARKNESS_START` | 0.5 | Sky darkness when the level begins |
| `STARLIGHT_INITIAL_COUNT` | 5 | Starlights on screen at level start |
| `STARLIGHT_SPAWN_INTERVAL_MS` | 5000 | Auto-spawn interval; resets on collect |
| `STARLIGHT_DARKNESS_RELIEF` | 0.1 | Darkness removed per starlight (`DARKNESS_START / STARLIGHT_INITIAL_COUNT`) |
| `DARKNESS_FILL_SECONDS` | 180 | Time for darkness to rise from 0% to 100% (from a 50% start, ~90s to lose if nothing is collected) |
| `HUD_DARKNESS_DEPTH` | 5 | Darkness overlay — above bg (0–3), below platforms (10) |
| `HUD_TEXT_DEPTH` | 6 | Starlight counter + darkness meter — above darkness overlay, below platforms |
| `HUD_DARKNESS_BAR_WIDTH` | 220 | Darkness meter track width (pixels) |
| `HUD_DARKNESS_BAR_HEIGHT` | 14 | Darkness meter track height (pixels) |
| `STARLIGHT_GROUND_OFFSET` | 18 | Walk-through height above platform surface |
| `STARLIGHT_JUMP_OFFSET` | 54 | Standing-jump height — must leave the ground |
| `STARLIGHT_ARC_OFFSET` | 42 | Run-jump height — paired with horizontal offset |
| `STARLIGHT_DISPLAY_SIZE` | 24 | On-screen starlight sprite size (one tile height) |
| `STARLIGHT_PULSE_SCALE` | 1.12 | Idle pulse tween peak scale |
| `STARLIGHT_PULSE_MS` | 700 | Pulse half-cycle duration |
| `STARLIGHT_TWINKLE_ALPHA_MIN` | 0.82 | Minimum alpha during twinkle |
| `STARLIGHT_TWINKLE_MS` | 900 | Twinkle half-cycle duration |
| `STARLIGHT_COLLECT_MS` | 280 | Collect burst duration |

- **Sprite:** `public/assets/starlight/stars.png` (texture key `starlight`, source **48×48**; displayed at 24px)
- **Idle motion:** `setupStarlightIdleAnimations()` in `starlightAnimations.ts` — **pulse + twinkle** tweens per starlight (staggered by spawn position; two tweens each)
- **Collect burst:** `playStarlightCollectAnimation()` — scale up, spin, fade out before the sprite is removed
- **Spawns:** **5** starlights at start. Every **5s** (and on each collect, which also resets the timer) a new starlight spawns at a random **reachable** position via `pickRandomStarlightSpawn()` — no two starlights share the same `col,row,floatOffsetPx`. Placement uses ground / jump / arc heights on runs with length ≥ 3.
- **Collection:** `physics.add.overlap` with player; each starlight reduces darkness by `STARLIGHT_DARKNESS_RELIEF` (0.1) and immediately spawns a replacement.
- **HUD:** Top-left — starlight icon (`hudStarlightIcon`) + `collected/total` count (`hudStarlightCount`; total increments on each spawn), **Darkness** label, then darkness meter. Bar updates in `updateDarknessVisuals()`, starlight count in `updateHud()`.
- **Overlay:** Full-screen `darknessOverlay` (scroll factor 0, depth 5); opacity tracks darkness (0 = clear, 1 = fully dark). Renders above parallax background but **below** platforms, trees, starlights, murklings, and the player. Updated every frame via `updateDarknessVisuals()`.
- **Pause:** `Esc` toggles pause (not available after win/lose). Freezes physics/tweens and shows a screen-space dialog: *The game is being paused* with **Resume** and **New Game** (`scene.restart()`).
- **Win:** Darkness reaches 0% → gameplay freezes in place (`physics.pause()`), wizard snaps to the nearest platform surface at or below their column (`getPlatformSurfaceYAt`), then loops `wizard-jump` with a vertical tween timed to walk-jump physics (full walk-jump height, ~1.1s per bounce; jump anim frame rate scaled to match), centered **VICTORY** title (104px, `#fff8c0`) + `You saved the world from the darkness!` subtitle (depth 100, scroll factor 0); no scene change
- **Lose:** Darkness reaches 100% → gameplay freezes in place (`physics.pause()`), wizard plays `wizard-die`, centered **GAME OVER** title (104px, `#fff8c0`) + `The sky went dark...` subtitle (depth 100, scroll factor 0); no scene change and no red overlay

---

## Murklings (baddies)

Patrol enemies on platform runs; contact adds darkness (no HP system).

| Constant | Value | Meaning |
|----------|-------|---------|
| `MURKLING_DARKNESS_SPIKE` | 0.08 | Darkness added per hit (8%) |
| `MURKLING_PATROL_SPEED` | 80 | Horizontal patrol speed (px/s) |
| `MURKLING_DISPLAY_SIZE` | 48 | On-screen sprite size |
| `MURKLING_HIT_COOLDOWN_MS` | 1200 | Invulnerability between hits |
| `MURKLING_KNOCKBACK_X` | 180 | Horizontal knockback on hit |
| `MIN_MURKLING_RUN_LENGTH` | 4 | Minimum platform run length to spawn |
| `MURKLING_SPAWN_INTERVAL_MS` | 3000 | Automatic murkling spawn interval |
| `MURKLING_INITIAL_COUNT` | 10 | Murklings on screen at level start |
| `MIN_GROUND_MURKLING_COUNT` | 3 | Ground-row murklings guaranteed at level start |
| `MURKLING_MIN_SPAWN_DISTANCE_FROM_WIZARD` | 144 | Min horizontal distance (px) from wizard when spawning |
| `MURKLING_WIZARD_DIRECTION_BIAS` | 0.7 | Probability murklings face the wizard on spawn / edge turn / jump-over |
| `MURKLING_JUMP_OVER_CLEARANCE_PX` | 12 | Min vertical gap (wizard feet above murkling feet) for jump-over turn |
| `MURKLING_JUMP_OVER_WINDOW_MS` | 600 | Ms after airborne cross to allow a jump-over direction roll after landing |
| `MURKLING_DIE_FPS` | 12 | Die animation frame rate |

- **Sprite:** `murkling/murkling-sheet.png` (texture key `murkling`, 8×2 grid of 32×32 cells); loops `murkling-walk` while patrolling
- **Die:** `murkling-die` animation uses row 1 of the same sheet (frames 8–15); plays on fireball hit, then sprite is removed
- **When:** **10** murklings at level start (**3** guaranteed on the ground row, rest random), then one every **3s** via `pickRandomMurklingSpawn()` (timer pauses with the game)
- **Where:** Random **reachable** platform run (length ≥ 4), including the ground; spawn position weighted by run length (cols); no two active murklings share the same `col,row` spawn cell; spawn must be ≥ **144px** horizontally from the wizard
- **Behavior:** Patrol between run edges on platform collider; on spawn, when turning at bounds, and when the wizard **jumps over** (airborne, feet above murkling, landed on the other side or murkling was walking away), **70%** chance (`MURKLING_WIZARD_DIRECTION_BIAS`) to walk toward the wizard’s X if valid on the run, otherwise classic bounce / midpoint-based / keep-current fallback; direction unchanged while the wizard walks past on the ground
- **On hit:** Darkness spike, knockback, `wizard-hurt` animation, brief purple tint
- **Fireball:** Space throws a fireball (`fireball` texture) in facing direction; plays `murkling-die` on overlap, then removes the murkling
- **Depth:** 18 (above platforms, below player)

---

## Background rendering

Four parallax `TileSprite` layers in `Game.create()`:

| Layer key | Scroll factor |
|-----------|---------------|
| `bg-layer-1` | 0.1 |
| `bg-layer-2` | 0.25 |
| `bg-layer-3` | 0.45 |
| `bg-layer-4` | 0.65 |

- Source textures: `public/assets/background/1.png`–`4.png` (576×324 each)
- `bgScale = max(viewportWidth/576, viewportHeight/324)`
- `setTileScale(bgScale)` — horizontal tiling across world width, **one row vertically** (no vertical repeat)
- No dark overlay layer (removed)

---

## Player logic (`src/game/scenes/Game.ts`)

### Movement model

**Arcade physics** with velocity-based continuous movement.

| Constant | Value |
|----------|-------|
| `PLAYER_SPEED` | 240 |
| `RUN_SPEED` | 360 |
| `PLAYER_DRAG_X` | 1400 | Horizontal drag — coast to stop when keys released |
| `JUMP_VELOCITY` | ~-438 | Walk jump height = `WALK_JUMP_ROWS` = 5 rows (`√(2gh)`, gravity 800) |
| `RUN_JUMP_VELOCITY` | ~-480 | Run jump height = `RUN_JUMP_ROWS` = 6 rows |

Jump heights are derived from row counts (`WALK_JUMP_ROWS` / `RUN_JUMP_ROWS`), so they stay clearly above the 4-row tier step and keep the world-map reachability model valid.

Player is `physics.add.sprite` with origin `(0.5, 1)` (feet at bottom). Hitbox is narrowed via `updatePlayerBody()` (35% width, 85% height, feet-aligned). `setDragX(PLAYER_DRAG_X)` — releasing movement keys no longer zeroes velocity instantly; the wizard coasts to a stop on the ground.

### Controls

| Input | Action |
|-------|--------|
| Left / Right (hold) | Move horizontally |
| Shift + Left / Right (hold) | Run (faster speed + run animation) |
| Up (press) | Jump (higher and farther if running) |
| Esc (press) | Pause / resume — opens menu with **Resume** and **New Game** |
| Space (press) | Throw a fireball (wizard-attack animation) |

### Ground / air detection

Debounced to avoid landing flicker:

- `groundedFrames` increments while `body.onFloor()`
- `airFrames` increments while airborne
- `isGrounded` = `groundedFrames >= 1`
- `inAir` = `airFrames >= 2`
- On jump: `airFrames = 2`, `groundedFrames = 0`

### Animation state machine

`setPlayerAnimation()` only switches when state changes.

| Priority | State | Animation | Condition |
|----------|-------|-----------|-----------|
| 1 | hurt | `wizard-hurt` | murkling hit — locks until animation completes |
| 2 | attack | `wizard-attack` | Space — locks until animation completes; spawns fireball |
| — | die | `wizard-die` | darkness game over — locks until scene ends |
| 2 | jump | `wizard-jump` | `inAir` |
| 3 | run | `wizard-run` | grounded, Shift + direction held |
| 4 | walk | `wizard-walk` | grounded, direction held or coasting (`|velocityX| > 8`) |
| 5 | idle | `wizard-idle` | grounded, no input and not coasting |

Run speed and boosted jump apply in air while Shift + direction remain held.

### Combat (`wizardCombatConfig.ts`)

| Constant | Value | Meaning |
|----------|-------|---------|
| `WIZARD_DISPLAY_WIDTH` / `WIZARD_DISPLAY_HEIGHT` | 96 / 76 | Locked on-screen wizard size (`setDisplaySize`) |
| `WIZARD_ATTACK_FRAME_IDS` | 000, 002, 004, 005, 006 | Attack source frame names (`5_ATTACK_*.png`) |
| `WIZARD_ATTACK_SHEET_FRAMES` | 25–29 | Attack animation indices in `wizard-sheet.png` |
| `WIZARD_DIE_SHEET_FRAMES` | 30–34 | Die animation indices in `wizard-sheet.png` |
| `WIZARD_ATTACK_FIREBALL_DELAY_MS` | 250 | Delay before fireball spawns |
| `FIREBALL_SPEED` | 420 | Horizontal speed (px/s) |
| `FIREBALL_DISPLAY_SIZE` | 20 | On-screen fireball diameter |
| `FIREBALL_GROUND_MAX_RANGE` | 480 | Max horizontal travel when fired on the ground (px) |

- **Space** plays `wizard-attack` (locks movement/anim until complete), then spawns a `fireball` projectile in facing direction
- Fireballs destroy murklings on overlap and despawn on platform hit or leaving world bounds; ground shots also despawn after **480px** horizontal travel
- Depth 19 (above murklings at 18, below player at 20)

### Movement flow

```mermaid
flowchart TD
    update[update] --> floor[track onFloor / airFrames]
    floor --> jump{jump pressed and grounded?}
    jump -->|yes| applyJump[setVelocityY walk or run jump]
    jump -->|no| move[setVelocityX from arrows]
    move --> anim{inAir?}
    anim -->|yes| jumpAnim[jump]
    anim -->|no| run{ctrl and moving?}
    run -->|yes| runAnim[run]
    run -->|no| walk{moving?}
    walk -->|yes| walkAnim[walk]
    walk -->|no| idleAnim[idle]
```

---

## Assets & animations (`Preloader.ts`)

### Loaded textures

| Asset | Texture key |
|-------|-------------|
| `background/1–4.png` | `bg-layer-1` … `bg-layer-4` |
| `platform/tiles/11.png` | `platform-tile-11` |
| `starlight/stars.png` | `starlight` |
| `platform/elements/tree1.png` | `tree-1` |
| `platform/elements/tree2.png` | `tree-2` |
| `wizard/wizard-sheet.png` | `wizard` (spritesheet, 96×76 cells) |
| `murkling/murkling-sheet.png` | `murkling` (spritesheet, 32×32 cells) |

### Registered animations

| Key | Sheet frames | FPS | Repeat |
|-----|--------------|-----|--------|
| `wizard-idle` | 0–4 | 8 | loop |
| `wizard-walk` | 5–9 | 10 | loop |
| `wizard-run` | 10–14 | 14 | loop |
| `wizard-jump` | 15–19 | 12 | once |
| `wizard-hurt` | 20–24 | 14 | once |
| `wizard-die` | 30–34 | 10 | once |
| `wizard-attack` | 25–29 | 12 | once |
| `murkling-walk` | 0–5 | 10 | loop |
| `murkling-die` | 8–15 | 12 | once |

### Wizard sprite notes

- Single spritesheet `wizard-sheet.png` (480×532, 5×7 grid of 96×76 cells); source PNGs in `wizard/` kept for editing — rebuild with `scripts/build-wizard-sheet.sh`
- Rows: idle, walk, run, jump, hurt, attack, die (5 frames each); walk/run/jump/hurt/attack rows are trimmed and upscaled to idle body height in `scripts/build-wizard-sheet.sh` (idle is the reference; die keeps authored collapse)
- Frames bottom-aligned in cells; feet at bottom of each cell (player origin `(0.5, 1)`); display locked to 96×76 via `WIZARD_DISPLAY_WIDTH` / `WIZARD_DISPLAY_HEIGHT`
- Procedural `fireball` texture for projectiles
- Platform tiles `01–10`, `12–22` and `spring_.png` exist but are **not used**

### Murkling sprite notes

- Single spritesheet `murkling-sheet.png` (256×64, 8×2 grid of 32×32 cells); source strips `walk.png` and `die.png` kept for editing — rebuild with `scripts/build-murkling-sheet.sh`
- Row 0: walk (6 frames); row 1: die (8 frames); frame indices in `baddiesConfig.ts` (`MURKLING_WALK_SHEET_FRAMES`, `MURKLING_DIE_SHEET_FRAMES`)

---

## React bridge

### `EventBus` (`src/game/EventBus.ts`)

| Event | Direction | Payload |
|-------|-----------|---------|
| `current-scene-ready` | Phaser → React | `Phaser.Scene` instance |

### `PhaserGame.tsx`

- Creates game via `StartGame('game-container')` on mount
- Updates `ref.current = { game, scene }` when scene is ready
- Destroys game on unmount

### `App.tsx`

- Renders `PhaserGame` in a full-viewport `#app` container

---

## Documentation & AI workflow

| Artifact | Location | Committed? |
|----------|----------|------------|
| Technical reference | `AGENTS.md` | Yes |
| Cursor rule (read + sync doc) | `.cursor/rules/agents-context.mdc` | No (`.cursor/` gitignored) |
| Feature plans | `.cursor/plans/*.plan.md` | No |

**Agent workflow:**

1. Read `AGENTS.md` before changing game code
2. After meaningful implementations, update `AGENTS.md` in the same task
3. Cursor does not persist internal reasoning — use `AGENTS.md` and git history as durable context

---

## Coding conventions

1. **Import Phaser symbols** — use named imports (`Input`, `Scene`) not global `Phaser.*` at runtime
2. **Minimal diffs** — match existing style in scenes
3. **New scenes** — register in `main.ts` scene array + emit `current-scene-ready`
4. **New assets** — load in `Preloader.preload()`, animations in `Preloader.create()`
5. **Sync docs** — update `AGENTS.md` when behavior or architecture changes

---

## Known gaps / extension points

| Feature | Status |
|---------|--------|
| MainMenu on startup | Skipped; Preloader → Game directly |
| Die animation | Implemented — `wizard-die` on darkness game over |
| Extra platform tiles (01–10, 12–22) | Not loaded |
| `changeScene()` on Game | Goes to GameOver (unused in normal flow) |
| Tile/grid world system | Removed (was `src/game/world/`; no longer in codebase) |

---

## Commands

```bash
npm install
npm run dev        # http://localhost:8080
npm run build      # production build → dist/
```

---

## File priority for common tasks

| Task | Read first |
|------|------------|
| Player movement / input | `src/game/scenes/Game.ts` |
| New sprites / anims | `src/game/scenes/Preloader.ts` |
| Screen size / physics / scenes | `src/game/main.ts` |
| React integration | `src/PhaserGame.tsx`, `src/App.tsx` |
