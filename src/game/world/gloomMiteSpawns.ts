import { MIN_GLOOM_MITE_RUN_LENGTH } from '../baddiesConfig';
import { WORLD_MAP_COLS, WORLD_MAP_ROWS, isPlatformCell, type WorldMap } from './worldMap';

export type GloomMiteSpawn = {
    col: number;
    row: number;
    startCol: number;
    endCol: number;
};

function spawnColInRun (startCol: number, runLength: number, row: number): number
{
    const innerLength = runLength - 2;

    if (innerLength <= 1)
    {
        return startCol + Math.floor(runLength / 2);
    }

    const offset = (startCol * 7 + row * 13) % innerLength;

    return startCol + 1 + offset;
}

export function getGloomMiteSpawns (map: WorldMap): GloomMiteSpawn[]
{
    const spawns: GloomMiteSpawn[] = [];
    const groundRow = WORLD_MAP_ROWS - 1;

    for (let row = 0; row < WORLD_MAP_ROWS; row++)
    {
        if (row === groundRow)
        {
            continue;
        }

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

            if (runLength < MIN_GLOOM_MITE_RUN_LENGTH)
            {
                col = endCol;
                continue;
            }

            spawns.push({
                col: spawnColInRun(col, runLength, row),
                row,
                startCol: col,
                endCol
            });

            col = endCol;
        }
    }

    return spawns;
}
