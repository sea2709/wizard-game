import type { GameSeason } from './config/seasonConfig';

const params = new URLSearchParams(window.location.search);

function flagFromUrl (name: string, devDefault: boolean): boolean
{
    if (!import.meta.env.DEV)
    {
        return false;
    }

    if (params.has(name))
    {
        const value = params.get(name);

        return value !== '0' && value !== 'false';
    }

    return devDefault;
}

/** Draw Arcade Physics body outlines (toggle in-game with P). */
export const DEBUG_PHYSICS = flagFromUrl('physicsDebug', false);

/** Overlay world-map grid and platform cells (toggle in-game with G). */
export const DEBUG_WORLD_GRID = flagFromUrl('worldGrid', false);

/** Testing: season index for a fresh run (1 Spring … 4 Winter). Revert to `1` for normal play. */
export const DEFAULT_START_SEASON: GameSeason = 1;
