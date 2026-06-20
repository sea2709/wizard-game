# The Starwarden

A 2D side-scrolling platformer built with **Phaser 4**, **React 19**, **TypeScript**, and **Vite**. Play as a wizard crossing a procedurally generated world through four seasons — collect starlights to push back the darkness, dodge or defeat murklings, and clear Spring through Winter to win.

> **AI / contributor reference:** See [AGENTS.md](AGENTS.md) for architecture, game logic, world generation, assets, and conventions. Start there instead of reading the full codebase.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080). The game loads **Story** → **Instructions** → **Game** (MainMenu is registered but skipped on cold start).

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build in `dist/` |

## How to play

Each season starts with the sky at **50% darkness**. Darkness rises passively over time (~90 seconds to reach 100% if you collect nothing). Collect **starlights** to reduce darkness; reach **0%** to clear the season. Beat all four seasons — Spring, Summer, Fall, Winter — to win. If darkness hits **100%**, you lose.

- **Murklings** patrol platforms; touching one adds darkness and knocks you back.
- **Striker murklings** (Summer onward) stop and shoot purple bolts at range.
- **Fireballs** (Space) destroy murklings but lock movement briefly during the attack animation.
- Clearing Spring–Fall shows a season-complete interstitial, regenerates the world, and advances to the next season.
- **Esc** opens pause with **Resume** and **New Game** (regenerates the map and restarts gameplay).

### Controls

| Input | Action |
|-------|--------|
| Left / Right | Move |
| Shift + Left / Right | Run (faster move + higher jump) |
| Up | Jump |
| Space | Throw fireball |
| Esc | Pause / resume |

## Stack

| Technology | Version |
|------------|---------|
| [Phaser](https://github.com/phaserjs/phaser) | 4 |
| [React](https://github.com/facebook/react) | 19 |
| [Vite](https://github.com/vitejs/vite) | 6 |
| [TypeScript](https://github.com/microsoft/TypeScript) | 5.7 |

Viewport: **1280 × 960**. World width: **6480px** (135 tile columns × 48px).

## Project structure

```
src/
  main.tsx, App.tsx, PhaserGame.tsx   # React shell + Phaser bridge
  game/
    main.ts                           # Phaser config, scene list
    debug.ts                          # Dev flags (physics grid, start season)
    scenes/                           # Preloader, Story, Instructions, Game, …
    world/                            # Procedural map, platforms, spawn pickers
    config/                           # Season, starlight, murkling, combat tuning
    stats/                            # Lifetime stats (localStorage)
public/assets/
  background/                         # Seasonal parallax layers
  platform/                           # Tiles + seasonal trees
  wizard/, murkling/, starlight/     # Character and collectible art
```

Key gameplay lives in `src/game/scenes/Game.ts`. Per-season difficulty and backgrounds are in `src/game/config/seasonConfig.ts`.

## Development

### Debugging

**IDE:** Run and Debug → **Debug in Chrome** (starts Vite and attaches the debugger; breakpoints work in `src/`).

**URL flags** (see `src/game/debug.ts`):

| Param | Effect |
|-------|--------|
| `?physicsDebug=1` | Arcade body outlines |
| `?worldGrid=1` | World-map grid overlay |

**In-game hotkeys** (dev builds, Game scene): **P** toggles physics debug, **G** toggles world grid.

`DEFAULT_START_SEASON` in `debug.ts` is currently **2 (Summer)** for testing; set to **1** for a normal Spring start.

Static assets load from `public/assets/` in Phaser's Preloader. After `npm run build`, they are copied to `dist/`.

### React ↔ Phaser bridge

`PhaserGame.tsx` creates the Phaser game and exposes it via React `ref`. Scenes emit `EventBus.emit('current-scene-ready', this)` when ready so React can track the active scene. See `src/game/EventBus.ts` and [AGENTS.md](AGENTS.md#react-bridge) for details.

## Deploying

Run `npm run build`, then upload the entire `dist/` folder to a static web host.

## Credits

Built on the [Phaser React TypeScript template](https://github.com/phaserjs/template-react-ts). Game design and implementation: The Starwarden project.
