import { MIN_MURKLING_RUN_LENGTH } from '../baddiesConfig';
import {
    getReachablePlatformRuns,
    type PlatformRun,
    type WorldMap
} from './worldMap';

export type MurklingSpawn = {
    col: number;
    row: number;
    startCol: number;
    endCol: number;
};

const MAX_RANDOM_SPAWN_ATTEMPTS = 64;

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

export function murklingSpawnKey (spawn: MurklingSpawn): string
{
    return `${spawn.col},${spawn.row}`;
}

function getReachableRunsForMurklings (map: WorldMap): PlatformRun[]
{
    return getReachablePlatformRuns(map).filter(
        (run) => run.endCol - run.startCol + 1 >= MIN_MURKLING_RUN_LENGTH
    );
}

function buildSpawn (run: PlatformRun, col: number): MurklingSpawn
{
    return {
        col,
        row: run.row,
        startCol: run.startCol,
        endCol: run.endCol
    };
}

/** Pick a random reachable murkling spawn not already in `occupied`. */
export function pickRandomMurklingSpawn (
    map: WorldMap,
    occupied: ReadonlySet<string>,
    random: () => number = Math.random
): MurklingSpawn | null
{
    const runs = getReachableRunsForMurklings(map);

    if (runs.length === 0)
    {
        return null;
    }

    for (let attempt = 0; attempt < MAX_RANDOM_SPAWN_ATTEMPTS; attempt++)
    {
        const run = runs[Math.floor(random() * runs.length)];
        const runLength = run.endCol - run.startCol + 1;
        const col = run.startCol + Math.floor(random() * runLength);
        const spawn = buildSpawn(run, col);

        if (!occupied.has(murklingSpawnKey(spawn)))
        {
            return spawn;
        }
    }

    return null;
}

export function getMurklingSpawns (map: WorldMap): MurklingSpawn[]
{
    const spawns: MurklingSpawn[] = [];

    for (const run of getReachableRunsForMurklings(map))
    {
        const runLength = run.endCol - run.startCol + 1;

        spawns.push(buildSpawn(run, spawnColInRun(run.startCol, runLength, run.row)));
    }

    return spawns;
}
