/** Darkness added when the wizard touches a murkling (0–1 scale). */
export const MURKLING_DARKNESS_SPIKE = 0.08;

/** Horizontal patrol speed in pixels per second. */
export const MURKLING_PATROL_SPEED = 80;

/** On-screen murkling sprite width/height. */
export const MURKLING_DISPLAY_SIZE = 48;

/** Source spritesheet cell size (`murkling/murkling-sheet.png`). */
export const MURKLING_FRAME_SIZE = 32;

/** Columns in `murkling-sheet.png` (row 0 = walk, row 1 = die). */
export const MURKLING_SHEET_COLS = 8;

/** `murkling-sheet.png` frame indices (row 0, cols 0–5). */
export const MURKLING_WALK_SHEET_FRAMES = [ 0, 1, 2, 3, 4, 5 ] as const;

/** Walk animation frame rate. */
export const MURKLING_WALK_FPS = 10;

/** `murkling-sheet.png` frame indices (row 1, cols 0–7). */
export const MURKLING_DIE_SHEET_FRAMES = [ 8, 9, 10, 11, 12, 13, 14, 15 ] as const;

/** Die animation frame rate. */
export const MURKLING_DIE_FPS = 12;

/** Minimum ms between murkling hits on the player. */
export const MURKLING_HIT_COOLDOWN_MS = 1200;

/** Horizontal knockback applied to the wizard on hit. */
export const MURKLING_KNOCKBACK_X = 180;

/** Platform runs shorter than this do not spawn a murkling. */
export const MIN_MURKLING_RUN_LENGTH = 4;

/** Ms between automatic murkling spawns. */
export const MURKLING_SPAWN_INTERVAL_MS = 3000;

/** Murklings present when the level begins. */
export const MURKLING_INITIAL_COUNT = 10;

/** Guaranteed ground-row murklings at level start (rest spawn randomly). */
export const MIN_GROUND_MURKLING_COUNT = 3;

/** Minimum horizontal distance (px) between a new murkling and the wizard. */
export const MURKLING_MIN_SPAWN_DISTANCE_FROM_WIZARD = 144;
