export const TILE_WIDTH = 48;
export const TILE_HEIGHT = 24;
export const WORLD_MAP_COLS = 135;
export const WORLD_MAP_ROWS = 40;

export const WORLD_WIDTH = WORLD_MAP_COLS * TILE_WIDTH;
export const WORLD_HEIGHT = WORLD_MAP_ROWS * TILE_HEIGHT;

export type WorldMapCell = 0 | 1 | 2 | 4;
export type WorldMap = WorldMapCell[][];

/** Tree width as a multiple of `TILE_WIDTH` (2×–4×). Stored per tree air cell. */
export type TreeSizeMultiplier = 2 | 3 | 4;

export const CELL_EMPTY = 0;
export const CELL_PLATFORM = 1;
export const CELL_TREE = 2;
export const CELL_TREE_2 = 4;

const GROUND_ROW = WORLD_MAP_ROWS - 1;

/** Total decorative trees placed per world generation. */
const TREE_COUNT = 4;

/** Minimum trees placed on the ground row (rest on floating tiers). */
const MIN_GROUND_TREE_COUNT = 1;

/** Minimum platform run length (cols) to host a tree. */
const MIN_TREE_RUN_LENGTH = 3;

/** Ground columns skipped near the player spawn (no trees). */
const TREE_SPAWN_SAFE_COLS = 10;

type TreeCandidate = {
    treeRow: number;
    platformRow: number;
    col: number;
};

/** Trees occupy the row directly above their platform tiles. */
const TREE_ROW_OFFSET = 1;

/**
 * Vertical spacing between platform tiers, in rows. 4 rows = 96px, well inside
 * the walk-jump apex (~120px), so each tier is reachable from the one below.
 */
const TIER_ROW_STEP = 4;

/** Tallest structure (in tiers) we ever build — kept low to limit tile count. */
const MAX_STRUCTURE_TIERS = 6;

/** Platform run length bounds. >=3 means every platform can host a starlight. */
const MIN_RUN_LENGTH = 3;
const MAX_RUN_LENGTH = 5;

/** Horizontal spacing (cols) between independent structures. */
const MIN_STRUCTURE_GAP = 6;
const MAX_STRUCTURE_GAP = 14;

/**
 * Empty columns between two stacked tiers of a staircase. This is the launch /
 * landing room the wizard needs: a tier never sits directly over the one below
 * (which would be an unjumpable overhang). Tuned to the wall-clearance math
 * below — 2 cols clears the wall, 3 still lands on the upper run.
 */
const MIN_STEP_GAP = 2;
const MAX_STEP_GAP = 3;

/** Where the first structure may begin (player spawns near col 1 on the ground). */
const FIRST_STRUCTURE_COL = 6;

// --- Reachability model (conservative walk-jump physics) -------------------
// These bounds describe the worst-case jump the player can always perform, so
// any edge the BFS accepts is genuinely traversable in-game. They must stay
// at or below the real jump in Game.ts (walk apex 5 rows, walk speed 240).

/** Max rows the player can climb in a single jump (96px tier << 120px apex). */
const MAX_JUMP_UP_ROWS = TIER_ROW_STEP;

/**
 * Max horizontal gap (cols) clearable while rising N rows, indexed by rise.
 * Derived from walk-jump airtime; smaller as the player climbs higher.
 */
const MAX_GAP_FOR_RISE = [5, 4, 4, 3, 3];

/** Horizontal gap (cols) clearable when dropping to a lower/level platform. */
const MAX_DROP_GAP = 6;

export type PlatformRun = {
    row: number;
    startCol: number;
    endCol: number;
};

function randInt (min: number, max: number): number
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp (value: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, value));
}

function createEmptyTreeScaleGrid (): TreeSizeMultiplier[][]
{
    return Array.from({ length: WORLD_MAP_ROWS }, () =>
        Array<TreeSizeMultiplier>(WORLD_MAP_COLS).fill(2)
    );
}

function createEmptyWorldMap (): WorldMap
{
    return Array.from({ length: WORLD_MAP_ROWS }, () =>
        Array<WorldMapCell>(WORLD_MAP_COLS).fill(0)
    );
}

function setPlatformRun (map: WorldMap, row: number, startCol: number, length: number): void
{
    for (let col = startCol; col < startCol + length; col++)
    {
        if (col < 0 || col >= WORLD_MAP_COLS || row < 0 || row >= WORLD_MAP_ROWS)
        {
            continue;
        }

        map[row][col] = CELL_PLATFORM;
    }
}

/** Whether a grid cell is solid walkable platform. */
export function isPlatformCell (cell: WorldMapCell): boolean
{
    return cell === CELL_PLATFORM;
}

/** Whether a grid cell holds a decorative tree (air row above a platform). */
export function isTreeCell (cell: WorldMapCell): boolean
{
    return cell === CELL_TREE || cell === CELL_TREE_2;
}

/** Phaser texture key for a tree map cell. */
export function getTreeTextureKey (cell: WorldMapCell): string
{
    return cell === CELL_TREE_2 ? 'tree-2' : 'tree-1';
}

function isTreeAirCell (map: WorldMap, row: number, col: number): boolean
{
    return isTreeCell(map[row][col]);
}

function footprintKey (treeRow: number, col: number): string
{
    return `${treeRow},${col}`;
}

/** True when any footprint column is already tree or reserved. */
function footprintIsClear (
    map: WorldMap,
    treeRow: number,
    anchorCol: number,
    sizeMult: TreeSizeMultiplier,
    reserved: Set<string>
): boolean
{
    for (const col of treeFootprintCols(anchorCol, sizeMult))
    {
        if (isTreeAirCell(map, treeRow, col) || reserved.has(footprintKey(treeRow, col)))
        {
            return false;
        }
    }

    return true;
}

function reserveFootprint (
    treeRow: number,
    anchorCol: number,
    sizeMult: TreeSizeMultiplier,
    reserved: Set<string>
): void
{
    for (const col of treeFootprintCols(anchorCol, sizeMult))
    {
        reserved.add(footprintKey(treeRow, col));
    }
}

function pickTreeCellType (treeRow: number, col: number): 2 | 4
{
    return (col + treeRow) % 2 === 0 ? CELL_TREE : CELL_TREE_2;
}

/**
 * Build one climbable structure starting at `baseCol`: a staircase that steps
 * UP one tier and OVER a small empty gap each step. The gap gives the wizard
 * clear sky to launch through and a side approach to land on the next step
 * (no overhang). Returns the rightmost column it occupies.
 */
function buildStructure (map: WorldMap, baseCol: number): number
{
    const tierCount = randInt(1, MAX_STRUCTURE_TIERS);

    let runLength = randInt(MIN_RUN_LENGTH, MAX_RUN_LENGTH);
    let runStart = clamp(baseCol, 0, WORLD_MAP_COLS - runLength);
    let maxCol = runStart + runLength - 1;

    for (let tier = 1; tier <= tierCount; tier++)
    {
        const row = GROUND_ROW - tier * TIER_ROW_STEP;

        if (row < 0)
        {
            break;
        }

        setPlatformRun(map, row, runStart, runLength);
        maxCol = Math.max(maxCol, runStart + runLength - 1);

        const stepGap = randInt(MIN_STEP_GAP, MAX_STEP_GAP);
        const nextLength = randInt(MIN_RUN_LENGTH, MAX_RUN_LENGTH);
        const nextStart = runStart + runLength + stepGap;

        if (nextStart + nextLength > WORLD_MAP_COLS)
        {
            break;
        }

        runStart = nextStart;
        runLength = nextLength;
    }

    return maxCol;
}

function getPlatformRuns (map: WorldMap): PlatformRun[]
{
    const runs: PlatformRun[] = [];

    for (let row = 0; row < WORLD_MAP_ROWS; row++)
    {
        let col = 0;

        while (col < WORLD_MAP_COLS)
        {
            if (!isPlatformCell(map[row][col]))
            {
                col++;
                continue;
            }

            let endCol = col;

            while (endCol + 1 < WORLD_MAP_COLS && isPlatformCell(map[row][endCol + 1]))
            {
                endCol++;
            }

            runs.push({ row, startCol: col, endCol });
            col = endCol + 1;
        }
    }

    return runs;
}

function runsGapCols (a: PlatformRun, b: PlatformRun): number
{
    if (a.endCol < b.startCol)
    {
        return b.startCol - a.endCol - 1;
    }

    if (b.endCol < a.startCol)
    {
        return a.startCol - b.endCol - 1;
    }

    return 0;
}

/** Whether the player can travel from run `from` to run `to` in one move. */
function canReach (from: PlatformRun, to: PlatformRun): boolean
{
    const gap = runsGapCols(from, to);
    const rise = from.row - to.row;

    if (rise >= 0)
    {
        if (rise > MAX_JUMP_UP_ROWS)
        {
            return false;
        }

        return gap <= MAX_GAP_FOR_RISE[rise];
    }

    return gap <= MAX_DROP_GAP;
}

/** Mark every run reachable (transitively) from the ground run via BFS. */
function computeReachableRuns (runs: PlatformRun[]): boolean[]
{
    const reachable = new Array<boolean>(runs.length).fill(false);
    const startIndex = runs.findIndex((run) => run.row === GROUND_ROW);

    if (startIndex === -1)
    {
        return reachable;
    }

    const queue = [ startIndex ];

    reachable[startIndex] = true;

    while (queue.length > 0)
    {
        const current = queue.shift()!;

        for (let i = 0; i < runs.length; i++)
        {
            if (!reachable[i] && canReach(runs[current], runs[i]))
            {
                reachable[i] = true;
                queue.push(i);
            }
        }
    }

    return reachable;
}

/** Platform runs reachable from the ground via the conservative jump model. */
export function getReachablePlatformRuns (map: WorldMap): PlatformRun[]
{
    const runs = getPlatformRuns(map);
    const reachable = computeReachableRuns(runs);

    return runs.filter((_, index) => reachable[index]);
}

/** Cached reachable runs for the live `worldMap`; refreshed on generation. */
let cachedReachablePlatformRuns: PlatformRun[] = [];

function refreshReachablePlatformRunsCache (): void
{
    cachedReachablePlatformRuns = getReachablePlatformRuns(worldMap);
}

/** Reachable platform runs for the current world without recomputing BFS. */
export function getCachedReachablePlatformRuns (): PlatformRun[]
{
    return cachedReachablePlatformRuns;
}

/**
 * Safety net: clear any platform run the player can't reach from the ground, so
 * a starlight is never spawned somewhere uncollectable.
 */
function pruneUnreachableRuns (map: WorldMap): void
{
    const runs = getPlatformRuns(map);
    const reachable = computeReachableRuns(runs);

    runs.forEach((run, index) =>
    {
        if (reachable[index])
        {
            return;
        }

        for (let col = run.startCol; col <= run.endCol; col++)
        {
            map[run.row][col] = CELL_EMPTY;
        }
    });
}

/**
 * Place exactly `TREE_COUNT` decorative trees on reachable platform runs.
 * Tree markers (`2` or `4`) go in the row above platform tiles; platforms stay `1`.
 */
function placeTrees (map: WorldMap, treeScale: TreeSizeMultiplier[][]): void
{
    const candidates = getTreeCandidates(map);
    const groundCandidates = candidates.filter((c) => c.platformRow === GROUND_ROW);
    const otherCandidates = candidates.filter((c) => c.platformRow !== GROUND_ROW);
    const reservedFootprints = new Set<string>();
    let placed = 0;
    let groundPlaced = 0;

    const tryPlace = ({ treeRow, platformRow, col }: TreeCandidate): boolean =>
    {
        const sizeMult = treeSizeForCell(treeRow, col);
        const platformRun = findPlatformRunAt(map, platformRow, col);

        if (!platformRun || !treeFitsOnRun(map, platformRun, col, sizeMult))
        {
            return false;
        }

        if (!footprintIsClear(map, treeRow, col, sizeMult, reservedFootprints))
        {
            return false;
        }

        map[treeRow][col] = pickTreeCellType(treeRow, col);
        treeScale[treeRow][col] = sizeMult;
        reserveFootprint(treeRow, col, sizeMult, reservedFootprints);

        return true;
    };

    const groundPicks = pickSpreadTreeCandidates(groundCandidates, MIN_GROUND_TREE_COUNT);

    for (const candidate of [ ...groundPicks, ...groundCandidates ].filter(uniqueTreeCandidate))
    {
        if (groundPlaced >= MIN_GROUND_TREE_COUNT || placed >= TREE_COUNT)
        {
            break;
        }

        if (tryPlace(candidate))
        {
            placed++;
            groundPlaced++;
        }
    }

    const remaining = TREE_COUNT - placed;
    const otherPicks = pickSpreadTreeCandidates(otherCandidates, remaining);

    for (const candidate of [ ...otherPicks, ...otherCandidates ].filter(uniqueTreeCandidate))
    {
        if (placed >= TREE_COUNT)
        {
            break;
        }

        if (tryPlace(candidate))
        {
            placed++;
        }
    }
}

function uniqueTreeCandidate (
    candidate: TreeCandidate,
    index: number,
    list: TreeCandidate[]
): boolean
{
    const key = `${candidate.treeRow},${candidate.col}`;

    return list.findIndex((c) => `${c.treeRow},${c.col}` === key) === index;
}

/** Pick candidates spread evenly left→right (quartile-style), not clustered at the start. */
function pickSpreadTreeCandidates (candidates: TreeCandidate[], count: number): TreeCandidate[]
{
    if (candidates.length === 0 || count <= 0)
    {
        return [];
    }

    const sorted = [ ...candidates ].sort((a, b) => a.col - b.col || a.platformRow - b.platformRow);
    const picked: TreeCandidate[] = [];
    const used = new Set<string>();
    const slots = Math.min(count, sorted.length);

    for (let i = 0; i < slots; i++)
    {
        const targetIndex = Math.floor((i + 0.5) * sorted.length / slots);

        for (let offset = 0; offset < sorted.length; offset++)
        {
            const tryRight = targetIndex + offset;
            const tryLeft = targetIndex - offset;
            const indices = offset === 0 ? [ tryRight ] : [ tryRight, tryLeft ];

            for (const index of indices)
            {
                if (index < 0 || index >= sorted.length)
                {
                    continue;
                }

                const candidate = sorted[index];
                const key = `${candidate.treeRow},${candidate.col}`;

                if (used.has(key))
                {
                    continue;
                }

                used.add(key);
                picked.push(candidate);
                break;
            }

            if (picked.length === i + 1)
            {
                break;
            }
        }
    }

    return picked;
}

function findPlatformRunAt (map: WorldMap, row: number, col: number): PlatformRun | null
{
    if (map[row][col] !== CELL_PLATFORM)
    {
        return null;
    }

    let startCol = col;

    while (startCol > 0 && map[row][startCol - 1] === CELL_PLATFORM)
    {
        startCol--;
    }

    let endCol = col;

    while (endCol + 1 < WORLD_MAP_COLS && map[row][endCol + 1] === CELL_PLATFORM)
    {
        endCol++;
    }

    return { row, startCol, endCol };
}

function getTreeCandidates (map: WorldMap): TreeCandidate[]
{
    const runs = getPlatformRuns(map);
    const reachable = computeReachableRuns(runs);
    const seen = new Set<string>();
    const candidates: TreeCandidate[] = [];

    runs.forEach((run, index) =>
    {
        if (!reachable[index])
        {
            return;
        }

        const runLength = run.endCol - run.startCol + 1;

        if (runLength < MIN_TREE_RUN_LENGTH)
        {
            return;
        }

        const anchorCols = run.row === GROUND_ROW
            ? getGroundTreeAnchorCols(run)
            : [ pickTreeAnchorCol(map, run) ].filter((col): col is number => col !== null);

        for (const col of anchorCols)
        {
            const treeRow = run.row - TREE_ROW_OFFSET;

            if (treeRow < 0)
            {
                continue;
            }

            if (run.row === GROUND_ROW && col < TREE_SPAWN_SAFE_COLS)
            {
                continue;
            }

            const sizeMult = treeSizeForCell(treeRow, col);

            if (!treeFitsOnRun(map, run, col, sizeMult))
            {
                continue;
            }

            const key = `${treeRow},${col}`;

            if (seen.has(key))
            {
                continue;
            }

            seen.add(key);
            candidates.push({ treeRow, platformRow: run.row, col });
        }
    });

    return candidates;
}

/** Spread anchor columns along the full ground run for tree placement. */
function getGroundTreeAnchorCols (run: PlatformRun): number[]
{
    const runLength = run.endCol - run.startCol + 1;
    const cols = new Set<number>();
    const fractions = [ 0.2, 0.35, 0.5, 0.65, 0.8 ];

    for (const fraction of fractions)
    {
        const col = run.startCol + Math.floor(runLength * fraction);

        if (col >= TREE_SPAWN_SAFE_COLS && col >= run.startCol && col <= run.endCol)
        {
            cols.add(col);
        }
    }

    return [ ...cols ];
}

function treeSizeForCell (row: number, col: number): TreeSizeMultiplier
{
    return (2 + (col * 13 + row * 7) % 3) as TreeSizeMultiplier;
}

/** Columns covered by a tree anchored at `col` with the given width multiplier. */
function treeFootprintCols (anchorCol: number, sizeMult: TreeSizeMultiplier): number[]
{
    const left = anchorCol - Math.floor((sizeMult - 1) / 2);
    const cols: number[] = [];

    for (let i = 0; i < sizeMult; i++)
    {
        cols.push(left + i);
    }

    return cols;
}

/** Whether a tree at `col` has platform tiles below and clear air above for its footprint. */
function treeFitsOnRun (
    map: WorldMap,
    run: PlatformRun,
    col: number,
    sizeMult: TreeSizeMultiplier
): boolean
{
    const treeRow = run.row - TREE_ROW_OFFSET;

    if (treeRow < 0)
    {
        return false;
    }

    for (const footprintCol of treeFootprintCols(col, sizeMult))
    {
        if (footprintCol < run.startCol || footprintCol > run.endCol)
        {
            return false;
        }

        if (map[run.row][footprintCol] !== CELL_PLATFORM)
        {
            return false;
        }

        if (map[treeRow][footprintCol] !== CELL_EMPTY && !isTreeAirCell(map, treeRow, footprintCol))
        {
            return false;
        }
    }

    return true;
}

/** Pick an anchor column on `run` where the full tree footprint sits on platform tiles. */
function pickTreeAnchorCol (map: WorldMap, run: PlatformRun): number | null
{
    const runLength = run.endCol - run.startCol + 1;

    if (runLength < MIN_TREE_RUN_LENGTH)
    {
        return null;
    }

    const preferred = [
        run.startCol + Math.floor(runLength / 2),
        run.startCol + 1,
        run.endCol - 1
    ];

    const tried = new Set<number>();

    for (const col of preferred)
    {
        if (col < run.startCol || col > run.endCol || tried.has(col))
        {
            continue;
        }

        tried.add(col);

        const sizeMult = treeSizeForCell(run.row - TREE_ROW_OFFSET, col);

        if (treeFitsOnRun(map, run, col, sizeMult))
        {
            return col;
        }
    }

    for (let col = run.startCol; col <= run.endCol; col++)
    {
        if (tried.has(col))
        {
            continue;
        }

        const sizeMult = treeSizeForCell(run.row - TREE_ROW_OFFSET, col);

        if (treeFitsOnRun(map, run, col, sizeMult))
        {
            return col;
        }
    }

    return null;
}

let worldTreeScale: TreeSizeMultiplier[][] = createEmptyTreeScaleGrid();

function createDefaultWorldMap (): WorldMap
{
    const map = createEmptyWorldMap();
    const treeScale = createEmptyTreeScaleGrid();

    for (let col = 0; col < WORLD_MAP_COLS; col++)
    {
        map[GROUND_ROW][col] = CELL_PLATFORM;
    }

    let col = FIRST_STRUCTURE_COL;

    while (col < WORLD_MAP_COLS - MIN_RUN_LENGTH)
    {
        const structureEnd = buildStructure(map, col);

        col = structureEnd + randInt(MIN_STRUCTURE_GAP, MAX_STRUCTURE_GAP);
    }

    pruneUnreachableRuns(map);
    placeTrees(map, treeScale);

    worldTreeScale = treeScale;

    return map;
}

/** Row-major grid: `worldMap[row][col]` — 0 = empty, 1 = platform, 2/4 = tree above platform */
export const worldMap: WorldMap = createDefaultWorldMap();

refreshReachablePlatformRunsCache();

/** Replace the live world grid with a freshly generated layout (also updates `worldTreeScale`). */
export function regenerateWorldMap (): void
{
    const fresh = createDefaultWorldMap();

    for (let row = 0; row < WORLD_MAP_ROWS; row++)
    {
        for (let col = 0; col < WORLD_MAP_COLS; col++)
        {
            worldMap[row][col] = fresh[row][col];
        }
    }

    refreshReachablePlatformRunsCache();
}

/** Tree width multipliers parallel to `worldMap` (meaningful where cell === 2). */
export { worldTreeScale };

/** Tree width multiplier at tree cell `row`/`col`; defaults to 2 when no tree is present. */
export function getTreeSizeMultiplier (row: number, col: number): TreeSizeMultiplier
{
    return worldTreeScale[row]?.[col] ?? 2;
}

/** Platform row directly below a tree marker cell. */
export function getTreePlatformRow (treeRow: number): number
{
    return treeRow + TREE_ROW_OFFSET;
}

export function tileToWorld (col: number, row: number): { x: number; y: number }
{
    return {
        x: col * TILE_WIDTH + TILE_WIDTH / 2,
        y: row * TILE_HEIGHT + TILE_HEIGHT
    };
}

/** Top surface Y for a grid row (where a character's feet should rest). */
export function tileSurfaceY (row: number): number
{
    return row * TILE_HEIGHT;
}
