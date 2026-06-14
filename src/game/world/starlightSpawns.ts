import {
    STARLIGHT_ARC_OFFSET,
    STARLIGHT_GROUND_OFFSET,
    STARLIGHT_JUMP_OFFSET
} from '../starlightConfig';
import { WORLD_MAP_COLS, WORLD_MAP_ROWS, isPlatformCell, type WorldMap } from './worldMap';

export type StarlightPlacement = 'ground' | 'jump' | 'arc';

export type StarlightSpawn = {
    col: number;
    row: number;
    floatOffsetPx: number;
    placement: StarlightPlacement;
};

const MIN_PLATFORM_RUN_LENGTH = 3;

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
