import { MIN_MURKLING_RUN_LENGTH, MURKLING_MIN_SPAWN_DISTANCE_FROM_WIZARD } from '../config/baddiesConfig';
import {
    getReachablePlatformRuns,
    tileToWorld,
    WORLD_MAP_ROWS,
    type PlatformRun,
    type WorldMap
} from './worldMap';

const GROUND_ROW = WORLD_MAP_ROWS - 1;

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

function runLength (run: PlatformRun): number
{
    return run.endCol - run.startCol + 1;
}

/** Pick a run with probability proportional to its length (cols). */
function pickWeightedRun (runs: PlatformRun[], random: () => number): PlatformRun
{
    let totalLength = 0;

    for (const run of runs)
    {
        totalLength += runLength(run);
    }

    let pick = random() * totalLength;

    for (const run of runs)
    {
        const length = runLength(run);

        if (pick < length)
        {
            return run;
        }

        pick -= length;
    }

    return runs[runs.length - 1];
}

function pickSpawnColInRun (run: PlatformRun, random: () => number): number
{
    return run.startCol + Math.floor(random() * runLength(run));
}

function isSpawnFarFromWizard (spawn: MurklingSpawn, wizardX: number): boolean
{
    const { x: spawnX } = tileToWorld(spawn.col, spawn.row);

    return Math.abs(spawnX - wizardX) >= MURKLING_MIN_SPAWN_DISTANCE_FROM_WIZARD;
}

function tryPickSpawnInRuns (
    runs: PlatformRun[],
    occupied: ReadonlySet<string>,
    random: () => number,
    maxAttempts: number,
    wizardX?: number
): MurklingSpawn | null
{
    if (runs.length === 0)
    {
        return null;
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++)
    {
        const run = pickWeightedRun(runs, random);
        const spawn = buildSpawn(run, pickSpawnColInRun(run, random));

        if (occupied.has(murklingSpawnKey(spawn)))
        {
            continue;
        }

        if (wizardX !== undefined && !isSpawnFarFromWizard(spawn, wizardX))
        {
            continue;
        }

        return spawn;
    }

    return null;
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
    random: () => number = Math.random,
    wizardX?: number
): MurklingSpawn | null
{
    return tryPickSpawnInRuns(
        getReachableRunsForMurklings(map),
        occupied,
        random,
        MAX_RANDOM_SPAWN_ATTEMPTS,
        wizardX
    );
}

/** Pick a random ground-row murkling spawn not already in `occupied`. */
export function pickRandomGroundMurklingSpawn (
    map: WorldMap,
    occupied: ReadonlySet<string>,
    random: () => number = Math.random,
    wizardX?: number
): MurklingSpawn | null
{
    const groundRuns = getReachableRunsForMurklings(map).filter((run) => run.row === GROUND_ROW);

    return tryPickSpawnInRuns(groundRuns, occupied, random, MAX_RANDOM_SPAWN_ATTEMPTS, wizardX);
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
