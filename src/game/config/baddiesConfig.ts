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

/** Guaranteed ground-row murklings at level start (rest spawn randomly). Spring default; see `seasonConfig`. */
export const MIN_GROUND_MURKLING_COUNT = 2;

/**
 * 0–1: when both ground and floating platform runs are available, random spawns
 * (timer + non-guaranteed initial) pick a platform run with this probability.
 */
export const MURKLING_PLATFORM_SPAWN_BIAS = 0.85;

/** Minimum horizontal distance (px) between a new murkling and the wizard. */
export const MURKLING_MIN_SPAWN_DISTANCE_FROM_WIZARD = 144;

/** 0–1 probability murklings pick wizard-facing direction on spawn / edge turn. */
export const MURKLING_WIZARD_DIRECTION_BIAS = 0.7;

/** Min vertical gap (px) between wizard feet and murkling feet to count as a jump-over. */
export const MURKLING_JUMP_OVER_CLEARANCE_PX = 12;

/** Ms after an airborne horizontal cross to still allow a jump-over direction roll. */
export const MURKLING_JUMP_OVER_WINDOW_MS = 600;

/**
 * Pick horizontal patrol direction: biased toward the wizard, else fallback.
 * Used on spawn, when turning at platform run edges, and when the wizard jumps over.
 */
export function resolveMurklingPatrolDirection (
    murklingX: number,
    wizardX: number,
    patrolMinX: number,
    patrolMaxX: number,
    fallbackMoveRight: boolean,
    preferredTowardMoveRight: boolean | null = null,
    random: () => number = Math.random
): boolean
{
    const atMinEdge = murklingX <= patrolMinX;
    const atMaxEdge = murklingX >= patrolMaxX;

    let towardWizardMoveRight = preferredTowardMoveRight;

    if (towardWizardMoveRight === null)
    {
        if (wizardX > murklingX)
        {
            towardWizardMoveRight = true;
        }
        else if (wizardX < murklingX)
        {
            towardWizardMoveRight = false;
        }
    }

    const biasTowardWizard = (): boolean =>
    {
        if (towardWizardMoveRight !== null && random() < MURKLING_WIZARD_DIRECTION_BIAS)
        {
            return towardWizardMoveRight;
        }

        return fallbackMoveRight;
    };

    if (atMinEdge && !atMaxEdge)
    {
        if (towardWizardMoveRight === false)
        {
            return true;
        }

        return biasTowardWizard();
    }

    if (atMaxEdge && !atMinEdge)
    {
        if (towardWizardMoveRight === true)
        {
            return false;
        }

        return biasTowardWizard();
    }

    return biasTowardWizard();
}
