export const TOTAL_PHASES = 2;

export type GamePhase = 1 | 2;

export type MurklingType = 'patrol' | 'striker';

/** Parallax background texture keys (4 layers, back → front). Loaded in `Preloader`. */
export type PhaseBackgroundLayers = readonly [
    string,
    string,
    string,
    string
];

/** Default phase-1 parallax set (`public/assets/background/1.png`–`4.png`). */
export const PHASE_1_BACKGROUND_LAYERS: PhaseBackgroundLayers = [
    'bg-layer-1',
    'bg-layer-2',
    'bg-layer-3',
    'bg-layer-4'
];

export type PhaseSettings = {
    phase: GamePhase;
    /** Parallax layer texture keys, one per `BACKGROUND_SCROLL_FACTORS` entry in `Game.ts`. */
    backgroundLayerKeys: PhaseBackgroundLayers;
    darknessFillSeconds: number;
    darknessStart: number;
    starlightInitialCount: number;
    starlightSpawnIntervalMs: number;
    starlightDarknessRelief: number;
    murklingDarknessSpike: number;
    murklingPatrolSpeed: number;
    murklingSpawnIntervalMs: number;
    murklingInitialCount: number;
    minGroundMurklingCount: number;
    strikerInitialCount: number;
    strikerSpawnChance: number;
};

/** Horizontal range (px) for striker murklings on the same platform tier. */
export const STRIKER_ATTACK_RANGE_PX = 320;

/** Ms between striker shots after a bolt is fired. */
export const STRIKER_ATTACK_COOLDOWN_MS = 2200;

/** Brief pause before a striker releases a bolt. */
export const STRIKER_WINDUP_MS = 400;

/** Striker bolt travel speed (px/s). */
export const STRIKER_PROJECTILE_SPEED = 280;

/** Darkness added when a striker bolt hits the wizard (0–1). */
export const STRIKER_PROJECTILE_DARKNESS_SPIKE = 0.09;

/** On-screen striker murkling sprite size. */
export const STRIKER_DISPLAY_SIZE = 52;

/** Purple tint applied to striker murklings. */
export const STRIKER_TINT = 0x9966cc;

/** On-screen striker bolt diameter (pixels). */
export const MURKLING_BOLT_DISPLAY_SIZE = 16;

const PHASE_1_SETTINGS: PhaseSettings = {
    phase: 1,
    backgroundLayerKeys: PHASE_1_BACKGROUND_LAYERS,
    darknessFillSeconds: 180,
    darknessStart: 0.5,
    starlightInitialCount: 5,
    starlightSpawnIntervalMs: 5000,
    starlightDarknessRelief: 0.5 / 5,
    murklingDarknessSpike: 0.08,
    murklingPatrolSpeed: 80,
    murklingSpawnIntervalMs: 3000,
    murklingInitialCount: 10,
    minGroundMurklingCount: 3,
    strikerInitialCount: 0,
    strikerSpawnChance: 0
};

const PHASE_2_SETTINGS: PhaseSettings = {
    phase: 2,
    // TODO: swap to phase-2 art when available (load keys in Preloader first).
    backgroundLayerKeys: PHASE_1_BACKGROUND_LAYERS,
    darknessFillSeconds: 120,
    darknessStart: 0.5,
    starlightInitialCount: 5,
    starlightSpawnIntervalMs: 5000,
    starlightDarknessRelief: 0.5 / 5,
    murklingDarknessSpike: 0.11,
    murklingPatrolSpeed: 100,
    murklingSpawnIntervalMs: 2200,
    murklingInitialCount: 12,
    minGroundMurklingCount: 4,
    strikerInitialCount: 3,
    strikerSpawnChance: 0.35
};

const PHASE_SETTINGS: Record<GamePhase, PhaseSettings> = {
    1: PHASE_1_SETTINGS,
    2: PHASE_2_SETTINGS
};

export function getPhaseSettings (phase: GamePhase): PhaseSettings
{
    return PHASE_SETTINGS[phase];
}
