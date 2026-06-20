export const TOTAL_SEASONS = 4;

export type GameSeason = 1 | 2 | 3 | 4;

export type SeasonName = 'Spring' | 'Summer' | 'Fall' | 'Winter';

export type MurklingType = 'patrol' | 'striker';

/** Parallax background texture keys (back → front). Loaded in `Preloader`. */
export type SeasonBackgroundLayers = readonly string[];

/** Spring parallax scroll factors — one per `SPRING_BACKGROUND_LAYERS` entry. */
export const SPRING_BACKGROUND_SCROLL_FACTORS = [0.1, 0.25, 0.45, 0.65] as const;

/** Default Spring parallax set (`public/assets/background/spring/1.png`–`4.png`, back → front). */
export const SPRING_BACKGROUND_LAYERS: SeasonBackgroundLayers = [
    'bg-layer-1',
    'bg-layer-2',
    'bg-layer-3',
    'bg-layer-4'
];

/** Summer parallax scroll factors — one per `SUMMER_BACKGROUND_LAYERS` entry. */
export const SUMMER_BACKGROUND_SCROLL_FACTORS = [0.1, 0.25, 0.45, 0.65] as const;

/**
 * Summer parallax set (`public/assets/background/summer/1.png`–`4.png`, back → front).
 * Matches `summer/orig.png`: warm sky (1), cloud banks (2–3), hills/lake/path (4).
 */
export const SUMMER_BACKGROUND_LAYERS: SeasonBackgroundLayers = [
    'bg-summer-layer-1',
    'bg-summer-layer-2',
    'bg-summer-layer-3',
    'bg-summer-layer-4'
];

/**
 * Fall parallax set (`public/assets/background/fall/1.png`–`5.png`).
 * Asset numbers run front → back; stack back → front to match `orig.png`:
 * sky (5), clouds (4), hills/deer (3), trees (2), foreground grass (1).
 */
export const FALL_BACKGROUND_SCROLL_FACTORS = [0.08, 0.14, 0.28, 0.48, 0.68] as const;

export const FALL_BACKGROUND_LAYERS: SeasonBackgroundLayers = [
    'bg-fall-layer-5',
    'bg-fall-layer-4',
    'bg-fall-layer-3',
    'bg-fall-layer-2',
    'bg-fall-layer-1'
];

/** Winter parallax scroll factors — one per `WINTER_BACKGROUND_LAYERS` entry. */
export const WINTER_BACKGROUND_SCROLL_FACTORS = [0.1, 0.25, 0.45, 0.65] as const;

/**
 * Winter parallax set (`public/assets/background/winter/1.png`–`4.png`, back → front).
 * Matches `winter/orig.png`: sky/clouds (1), distant trees (2), ice and snow (3), foreground tree (4).
 */
export const WINTER_BACKGROUND_LAYERS: SeasonBackgroundLayers = [
    'bg-winter-layer-1',
    'bg-winter-layer-2',
    'bg-winter-layer-3',
    'bg-winter-layer-4'
];

export type SeasonSettings = {
    season: GameSeason;
    name: SeasonName;
    /** HUD season label tint (hex CSS color). */
    hudColor: string;
    /** Shown on the interstitial after clearing this season (unused on Winter). */
    transitionMessage: string;
    /** Parallax layer texture keys, back → front. */
    backgroundLayerKeys: SeasonBackgroundLayers;
    /** Parallax scroll factor per layer — same length as `backgroundLayerKeys`. */
    backgroundScrollFactors: readonly number[];
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

const SPRING_SETTINGS: SeasonSettings = {
    season: 1,
    name: 'Spring',
    hudColor: '#a8e6a0',
    transitionMessage: 'Summer heat rises — press Enter to continue',
    backgroundLayerKeys: SPRING_BACKGROUND_LAYERS,
    backgroundScrollFactors: SPRING_BACKGROUND_SCROLL_FACTORS,
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

const SUMMER_SETTINGS: SeasonSettings = {
    season: 2,
    name: 'Summer',
    hudColor: '#fff8c0',
    transitionMessage: 'Fall shadows lengthen — press Enter to continue',
    backgroundLayerKeys: SUMMER_BACKGROUND_LAYERS,
    backgroundScrollFactors: SUMMER_BACKGROUND_SCROLL_FACTORS,
    darknessFillSeconds: 160,
    darknessStart: 0.5,
    starlightInitialCount: 5,
    starlightSpawnIntervalMs: 5000,
    starlightDarknessRelief: 0.5 / 5,
    murklingDarknessSpike: 0.09,
    murklingPatrolSpeed: 87,
    murklingSpawnIntervalMs: 2733,
    murklingInitialCount: 10,
    minGroundMurklingCount: 3,
    strikerInitialCount: 1,
    strikerSpawnChance: 0.12
};

const FALL_SETTINGS: SeasonSettings = {
    season: 3,
    name: 'Fall',
    hudColor: '#ffaa66',
    transitionMessage: 'Winter cold deepens — press Enter to continue',
    backgroundLayerKeys: FALL_BACKGROUND_LAYERS,
    backgroundScrollFactors: FALL_BACKGROUND_SCROLL_FACTORS,
    darknessFillSeconds: 140,
    darknessStart: 0.5,
    starlightInitialCount: 5,
    starlightSpawnIntervalMs: 5000,
    starlightDarknessRelief: 0.5 / 5,
    murklingDarknessSpike: 0.10,
    murklingPatrolSpeed: 93,
    murklingSpawnIntervalMs: 2467,
    murklingInitialCount: 11,
    minGroundMurklingCount: 3,
    strikerInitialCount: 2,
    strikerSpawnChance: 0.24
};

const WINTER_SETTINGS: SeasonSettings = {
    season: 4,
    name: 'Winter',
    hudColor: '#aaccff',
    transitionMessage: '',
    backgroundLayerKeys: WINTER_BACKGROUND_LAYERS,
    backgroundScrollFactors: WINTER_BACKGROUND_SCROLL_FACTORS,
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

const SEASON_SETTINGS: Record<GameSeason, SeasonSettings> = {
    1: SPRING_SETTINGS,
    2: SUMMER_SETTINGS,
    3: FALL_SETTINGS,
    4: WINTER_SETTINGS
};

export function getSeasonSettings (season: GameSeason): SeasonSettings
{
    return SEASON_SETTINGS[season];
}

export function getSeasonName (season: GameSeason): SeasonName
{
    return SEASON_SETTINGS[season].name;
}
