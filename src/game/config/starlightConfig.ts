/** Legacy/doc constant; live passive fill uses `DARKNESS_FILL_SECONDS` in `seasonConfig.ts`. */
export const DARKNESS_FILL_SECONDS = 180;

/** Sky darkness at level start (0 = clear, 1 = fully dark). */
export const DARKNESS_START = 0.5;

/** Starlights present when the level begins. */
export const STARLIGHT_INITIAL_COUNT = 5;

/** Ms between automatic starlight spawns (also resets on collect). */
export const STARLIGHT_SPAWN_INTERVAL_MS = 5000;

/** Darkness removed per starlight collected (tuned for `DARKNESS_START` + initial count). */
export const STARLIGHT_DARKNESS_RELIEF = DARKNESS_START / STARLIGHT_INITIAL_COUNT;

/** Darkness overlay depth — above parallax background (0–3), below platforms (10). */
export const HUD_DARKNESS_DEPTH = 5;

/** Starlight counter text depth — above darkness overlay, below platforms (10). */
export const HUD_TEXT_DEPTH = 6;

/** Darkness meter track width (pixels). */
export const HUD_DARKNESS_BAR_WIDTH = 220;

/** Darkness meter track height (pixels). */
export const HUD_DARKNESS_BAR_HEIGHT = 14;

/** Darkness meter top-left X (screen space). */
export const HUD_DARKNESS_BAR_X = 16;

/** Starlight HUD icon top-left position (screen space). */
export const HUD_STARLIGHT_X = 16;
export const HUD_STARLIGHT_Y = 16;

/** Gap between starlight HUD icon and count text (pixels). */
export const HUD_STARLIGHT_COUNT_GAP = 8;

/** Darkness label top-left Y — below starlight counter (screen space). */
export const HUD_DARKNESS_LABEL_Y = 44;

/** Vertical space reserved for the Darkness label (pixels). */
export const HUD_DARKNESS_LABEL_LINE_HEIGHT = 22;

/** Gap between Darkness label and bar (pixels). */
export const HUD_DARKNESS_LABEL_GAP = 8;

/** Darkness meter bar top-left Y — below label (screen space). */
export const HUD_DARKNESS_BAR_Y = HUD_DARKNESS_LABEL_Y + HUD_DARKNESS_LABEL_LINE_HEIGHT + HUD_DARKNESS_LABEL_GAP;

/** On-screen size of the starlight collectible sprite. */
export const STARLIGHT_DISPLAY_SIZE = 24;

/** Pulse scale range for the idle starlight tween (1 = base display size). */
export const STARLIGHT_PULSE_SCALE = 1.12;

/** Idle pulse tween duration in ms (one half-cycle). */
export const STARLIGHT_PULSE_MS = 700;

/** Minimum alpha during the twinkle shimmer. */
export const STARLIGHT_TWINKLE_ALPHA_MIN = 0.82;

/** Twinkle half-cycle duration in ms. */
export const STARLIGHT_TWINKLE_MS = 900;

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
