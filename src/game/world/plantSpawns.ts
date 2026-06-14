import {
    FLOATING_PLANT_CHANCE,
    GROUND_PLANT_CHANCE,
    MIN_PLANT_RUN_LENGTH,
    PLANT_1_DISPLAY_HEIGHT,
    PLANT_1_HEIGHT_JITTER,
    PLANT_SPAWN_SAFE_COLS
} from '../plantsConfig';
import { WORLD_MAP_COLS, WORLD_MAP_ROWS, type WorldMap } from './worldMap';

export type PlantSpawn = {
    col: number;
    row: number;
    flipX: boolean;
    displayHeight: number;
    animDelay: number;
};

const GROUND_ROW = WORLD_MAP_ROWS - 1;

function runSeed (startCol: number, row: number, runLength: number, slot: number): number
{
    return (startCol * 19 + row * 37 + runLength * 11 + slot * 53) % 100;
}

function plantHeight (seed: number): number
{
    const jitter = ((seed % 25) - 12) / 100 * PLANT_1_HEIGHT_JITTER;

    return Math.round(PLANT_1_DISPLAY_HEIGHT * (1 + jitter));
}

function shouldPlacePlant (seed: number, isGround: boolean): boolean
{
    const chance = isGround ? GROUND_PLANT_CHANCE : FLOATING_PLANT_CHANCE;

    return seed < chance;
}

function edgeCol (startCol: number, endCol: number, seed: number): number
{
    const useEnd = seed % 2 === 0;

    return useEnd ? endCol - 1 : startCol + 1;
}

function spawnsForRun (
    startCol: number,
    endCol: number,
    row: number,
    isGround: boolean
): PlantSpawn[]
{
    const runLength = endCol - startCol + 1;

    if (runLength < MIN_PLANT_RUN_LENGTH)
    {
        return [];
    }

    if (isGround && endCol < PLANT_SPAWN_SAFE_COLS)
    {
        return [];
    }

    const spawns: PlantSpawn[] = [];
    const baseSeed = runSeed(startCol, row, runLength, 0);

    if (!shouldPlacePlant(baseSeed, isGround))
    {
        return [];
    }

    const col = edgeCol(startCol, endCol, baseSeed);

    spawns.push({
        col,
        row,
        flipX: baseSeed % 3 === 0,
        displayHeight: plantHeight(baseSeed),
        animDelay: (baseSeed * 37) % 1200
    });

    // Long ground runs can host a second plant on the opposite edge.
    if (isGround && runLength >= 10)
    {
        const secondSeed = runSeed(startCol, row, runLength, 1);

        if (secondSeed < 45)
        {
            const oppositeCol = col <= startCol + 1 ? endCol - 1 : startCol + 1;

            if (Math.abs(oppositeCol - col) >= 3)
            {
                spawns.push({
                    col: oppositeCol,
                    row,
                    flipX: secondSeed % 3 !== 0,
                    displayHeight: plantHeight(secondSeed),
                    animDelay: (secondSeed * 41) % 1200
                });
            }
        }
    }

    return spawns;
}

export function getPlantSpawns (map: WorldMap): PlantSpawn[]
{
    const spawns: PlantSpawn[] = [];

    for (let row = 0; row < WORLD_MAP_ROWS; row++)
    {
        const isGround = row === GROUND_ROW;

        for (let col = 0; col < WORLD_MAP_COLS; col++)
        {
            if (map[row][col] !== 1)
            {
                continue;
            }

            if (col > 0 && map[row][col - 1] === 1)
            {
                continue;
            }

            let endCol = col;

            while (endCol + 1 < WORLD_MAP_COLS && map[row][endCol + 1] === 1)
            {
                endCol++;
            }

            spawns.push(...spawnsForRun(col, endCol, row, isGround));
            col = endCol;
        }
    }

    return spawns;
}
