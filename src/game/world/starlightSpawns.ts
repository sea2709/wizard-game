import {
    STARLIGHT_ARC_OFFSET,
    STARLIGHT_GROUND_OFFSET,
    STARLIGHT_JUMP_OFFSET
} from '../config/starlightConfig';
import {
    WORLD_MAP_COLS,
    WORLD_MAP_ROWS,
    getReachablePlatformRuns,
    isPlatformCell,
    type PlatformRun,
    type WorldMap
} from './worldMap';

export type StarlightPlacement = 'ground' | 'jump' | 'arc';

export type StarlightSpawn = {
    col: number;
    row: number;
    floatOffsetPx: number;
    placement: StarlightPlacement;
};

const MIN_PLATFORM_RUN_LENGTH = 3;
const MAX_RANDOM_SPAWN_ATTEMPTS = 64;

/** Deterministic hash for stable placement per platform run. */
function runSeed (startCol: number, row: number, runLength: number): number
{
    return (startCol * 17 + row * 31 + runLength * 7) % 100;
}

function pickPlacement (seed: number, runLength: number): StarlightPlacement
{
    if (runLength < 4)
    {
        return seed < 55 ? 'ground' : 'jump';
    }

    if (seed < 40)
    {
        return 'ground';
    }

    if (seed < 75)
    {
        return 'jump';
    }

    return 'arc';
}

function floatOffsetForPlacement (placement: StarlightPlacement): number
{
    switch (placement)
    {
        case 'jump':
            return STARLIGHT_JUMP_OFFSET;
        case 'arc':
            return STARLIGHT_ARC_OFFSET;
        default:
            return STARLIGHT_GROUND_OFFSET;
    }
}

function placementsForRunLength (runLength: number): StarlightPlacement[]
{
    if (runLength < 4)
    {
        return [ 'ground', 'jump' ];
    }

    return [ 'ground', 'jump', 'arc' ];
}

export function starlightSpawnKey (spawn: StarlightSpawn): string
{
    return `${spawn.col},${spawn.row},${spawn.floatOffsetPx}`;
}

function buildSpawn (col: number, row: number, placement: StarlightPlacement): StarlightSpawn
{
    return {
        col,
        row,
        floatOffsetPx: floatOffsetForPlacement(placement),
        placement
    };
}

function placeStarlight (
    startCol: number,
    endCol: number,
    row: number,
    runLength: number
): StarlightSpawn
{
    const seed = runSeed(startCol, row, runLength);
    const placement = pickPlacement(seed, runLength);
    const centerCol = startCol + Math.floor(runLength / 2);

    switch (placement)
    {
        case 'jump':
            return {
                col: centerCol,
                row,
                floatOffsetPx: STARLIGHT_JUMP_OFFSET,
                placement
            };

        case 'arc':
        {
            const towardEnd = seed % 2 === 0;

            return {
                col: towardEnd ? endCol - 1 : startCol + 1,
                row,
                floatOffsetPx: STARLIGHT_ARC_OFFSET,
                placement
            };
        }

        default:
            return {
                col: centerCol,
                row,
                floatOffsetPx: STARLIGHT_GROUND_OFFSET,
                placement
            };
    }
}

function getReachableRunsForStarlights (map: WorldMap): PlatformRun[]
{
    return getReachablePlatformRuns(map).filter(
        (run) => run.endCol - run.startCol + 1 >= MIN_PLATFORM_RUN_LENGTH
    );
}

/** Pick a random reachable starlight position not already in `occupied`. */
export function pickRandomStarlightSpawn (
    map: WorldMap,
    occupied: ReadonlySet<string>,
    random: () => number = Math.random
): StarlightSpawn | null
{
    const runs = getReachableRunsForStarlights(map);

    if (runs.length === 0)
    {
        return null;
    }

    for (let attempt = 0; attempt < MAX_RANDOM_SPAWN_ATTEMPTS; attempt++)
    {
        const run = runs[Math.floor(random() * runs.length)];
        const runLength = run.endCol - run.startCol + 1;
        const col = run.startCol + Math.floor(random() * runLength);
        const placements = placementsForRunLength(runLength);
        const placement = placements[Math.floor(random() * placements.length)];
        const spawn = buildSpawn(col, run.row, placement);

        if (!occupied.has(starlightSpawnKey(spawn)))
        {
            return spawn;
        }
    }

    return null;
}

export function getStarlightSpawns (map: WorldMap): StarlightSpawn[]
{
    const spawns: StarlightSpawn[] = [];

    for (let row = 0; row < WORLD_MAP_ROWS; row++)
    {
        for (let col = 0; col < WORLD_MAP_COLS; col++)
        {
            if (!isPlatformCell(map[row][col]))
            {
                continue;
            }

            if (col > 0 && isPlatformCell(map[row][col - 1]))
            {
                continue;
            }

            let endCol = col;

            while (endCol + 1 < WORLD_MAP_COLS && isPlatformCell(map[row][endCol + 1]))
            {
                endCol++;
            }

            const runLength = endCol - col + 1;

            if (runLength < MIN_PLATFORM_RUN_LENGTH)
            {
                col = endCol;
                continue;
            }

            spawns.push(placeStarlight(col, endCol, row, runLength));
            col = endCol;
        }
    }

    return spawns;
}
