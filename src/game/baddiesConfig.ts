/** Darkness added when the wizard touches a murkling (0–1 scale). */
export const MURKLING_DARKNESS_SPIKE = 0.08;

/** Horizontal patrol speed in pixels per second. */
export const MURKLING_PATROL_SPEED = 80;

/** On-screen murkling sprite width/height. */
export const MURKLING_DISPLAY_SIZE = 48;

/** Source walk spritesheet cell size (`monster/walk.png`). */
export const MURKLING_FRAME_SIZE = 32;

/** Walk animation frame count in `monster/walk.png`. */
export const MURKLING_WALK_FRAME_COUNT = 6;

/** Walk animation frame rate. */
export const MURKLING_WALK_FPS = 10;

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
