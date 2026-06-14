/** Seconds until the sky is fully dark with no starlights collected. */
export const DARKNESS_FILL_SECONDS = 90;

/** On-screen size of the starlight collectible sprite. */
export const STARLIGHT_DISPLAY_SIZE = 24;

/** Pulse scale range for the idle starlight tween (1 = base display size). */
export const STARLIGHT_PULSE_SCALE = 1.12;

/** Idle pulse tween duration in ms (one half-cycle). */
export const STARLIGHT_PULSE_MS = 700;

/** Vertical bob amplitude in pixels (half-cycle). */
export const STARLIGHT_BOB_PX = 5;

/** Vertical bob duration in ms (one half-cycle). */
export const STARLIGHT_BOB_MS = 1200;

/** Turn-around swing amplitude in degrees (each side of center). */
export const STARLIGHT_TURN_ANGLE = 24;

/** Turn-around half-cycle duration in ms. */
export const STARLIGHT_TURN_MS = 1400;

/** Minimum alpha during the twinkle shimmer. */
export const STARLIGHT_TWINKLE_ALPHA_MIN = 0.82;

/** Twinkle half-cycle duration in ms. */
export const STARLIGHT_TWINKLE_MS = 900;

/** One full slow-spin rotation duration in ms. */
export const STARLIGHT_SPIN_MS = 5200;

/** Collect burst duration in ms. */
export const STARLIGHT_COLLECT_MS = 280;

/** Collect burst peak scale multiplier. */
export const STARLIGHT_COLLECT_SCALE = 1.55;

/** Walk-through starlight height above platform surface (pixels). */
export const STARLIGHT_GROUND_OFFSET = 18;

/** Jump starlight height — above a standing jump reach, requires leaving the ground. */
export const STARLIGHT_JUMP_OFFSET = 54;

/** Arc starlight height — paired with a horizontal offset; best collected on a run jump. */
export const STARLIGHT_ARC_OFFSET = 42;
