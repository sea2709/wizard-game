const params = new URLSearchParams(window.location.search);

function flagFromUrl (name: string, devDefault: boolean): boolean
{
    if (params.has(name))
    {
        const value = params.get(name);

        return value !== '0' && value !== 'false';
    }

    return import.meta.env.DEV && devDefault;
}

/** Draw Arcade Physics body outlines (toggle in-game with P). */
export const DEBUG_PHYSICS = flagFromUrl('physicsDebug', false);

/** Overlay world-map grid and platform cells (toggle in-game with G). */
export const DEBUG_WORLD_GRID = flagFromUrl('worldGrid', false);
