/** Number of frames in `platform/plant_1/Plant1_*.png`. */
export const PLANT_1_FRAME_COUNT = 90;

/** Idle sway animation frame rate. */
export const PLANT_1_ANIM_FPS = 12;

/** Base on-screen plant height in pixels (~8 tile rows). */
export const PLANT_1_DISPLAY_HEIGHT = 192;

/** Per-spawn height jitter as a fraction of base height (±). */
export const PLANT_1_HEIGHT_JITTER = 0.12;

/** Render depth — above platforms (10), below starlights/player. */
export const PLANT_DEPTH = 12;

/** Minimum platform run length (cols) to place a plant. */
export const MIN_PLANT_RUN_LENGTH = 4;

/** Chance (0–100) a qualifying ground run gets at least one plant. */
export const GROUND_PLANT_CHANCE = 72;

/** Chance (0–100) a qualifying floating run gets a plant. */
export const FLOATING_PLANT_CHANCE = 38;

/** Ground columns skipped near the player spawn (no plants). */
export const PLANT_SPAWN_SAFE_COLS = 6;
