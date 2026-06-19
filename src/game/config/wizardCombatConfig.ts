/** Attack animation source frames (`5_ATTACK_*.png`). */
export const WIZARD_ATTACK_FRAME_IDS = [ '000', '002', '004', '005', '006' ] as const;

/** `wizard-sheet.png` frame indices (row 6, cols 0–4). */
export const WIZARD_ATTACK_SHEET_FRAMES = [ 25, 26, 27, 28, 29 ] as const;

/** `wizard-sheet.png` frame indices (row 7, cols 0–4). */
export const WIZARD_DIE_SHEET_FRAMES = [ 30, 31, 32, 33, 34 ] as const;

/** On-screen wizard size (matches `wizard-sheet.png` cell size). */
export const WIZARD_DISPLAY_WIDTH = 96;
export const WIZARD_DISPLAY_HEIGHT = 76;

/** Attack animation frame rate. */
export const WIZARD_ATTACK_FPS = 12;

/** Ms after attack starts before the fireball is released. */
export const WIZARD_ATTACK_FIREBALL_DELAY_MS = 250;

/** Fireball horizontal speed (px/s). */
export const FIREBALL_SPEED = 420;

/** On-screen fireball diameter (pixels). */
export const FIREBALL_DISPLAY_SIZE = 20;

/** Fireball spawn offset from the wizard feet (pixels). */
export const FIREBALL_SPAWN_OFFSET_X = 36;
export const FIREBALL_SPAWN_OFFSET_Y = -48;

/** Max horizontal travel when fired from the ground (pixels). */
export const FIREBALL_GROUND_MAX_RANGE = 480;
