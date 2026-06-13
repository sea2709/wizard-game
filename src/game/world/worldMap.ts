export const TILE_WIDTH = 48;
export const TILE_HEIGHT = 24;
export const WORLD_MAP_COLS = 135;
export const WORLD_MAP_ROWS = 40;

export const WORLD_WIDTH = WORLD_MAP_COLS * TILE_WIDTH;
export const WORLD_HEIGHT = WORLD_MAP_ROWS * TILE_HEIGHT;

export type WorldMapCell = 0 | 1;
export type WorldMap = WorldMapCell[][];

type PlatformSegment = {
    startCol: number;
    length: number;
};

type TierSegmentGroup = {
    tier: number;
    segments: PlatformSegment[];
};

const MIN_ADJACENT_TIER_GAP = 4;
const FLOATING_TIER_COUNT = 7;

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

        map[row][col] = 1;
    }
}

function segmentEnd (segment: PlatformSegment): number
{
    return segment.startCol + segment.length - 1;
}

function segmentOverlapCols (a: PlatformSegment, b: PlatformSegment): number
{
    const overlapStart = Math.max(a.startCol, b.startCol);
    const overlapEnd = Math.min(segmentEnd(a), segmentEnd(b));

    return Math.max(0, overlapEnd - overlapStart + 1);
}

function segmentGapCols (a: PlatformSegment, b: PlatformSegment): number
{
    const aEnd = segmentEnd(a);
    const bEnd = segmentEnd(b);

    if (aEnd < b.startCol)
    {
        return b.startCol - aEnd - 1;
    }

    if (bEnd < a.startCol)
    {
        return a.startCol - bEnd - 1;
    }

    return -segmentOverlapCols(a, b);
}

function hasMinAdjacentTierGap (a: PlatformSegment, b: PlatformSegment): boolean
{
    return segmentGapCols(a, b) >= MIN_ADJACENT_TIER_GAP;
}

function isValidSegmentForTier (
    candidate: PlatformSegment,
    adjacentGroups: TierSegmentGroup[]
): boolean
{
    for (const { segments } of adjacentGroups)
    {
        for (const segment of segments)
        {
            if (!hasMinAdjacentTierGap(candidate, segment))
            {
                return false;
            }
        }
    }

    return true;
}

function findValidStartCol (
    preferredStart: number,
    length: number,
    adjacentGroups: TierSegmentGroup[],
    searchRadius = 48
): number | null
{
    for (let delta = 0; delta <= searchRadius; delta++)
    {
        for (const offset of delta === 0 ? [ 0 ] : [ delta, -delta ])
        {
            const startCol = preferredStart + offset;

            if (startCol < 0 || startCol + length > WORLD_MAP_COLS)
            {
                continue;
            }

            const candidate = { startCol, length };

            if (isValidSegmentForTier(candidate, adjacentGroups))
            {
                return startCol;
            }
        }
    }

    return null;
}

function shuffleTiers (tiers: number[]): number[]
{
    const result = [ ...tiers ];

    for (let i = result.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.random() * (i + 1));
        [ result[i], result[j] ] = [ result[j], result[i] ];
    }

    return result;
}

function getAdjacentTierSegmentGroups (tier: number, tierSegments: Map<number, PlatformSegment[]>): TierSegmentGroup[]
{
    const groups: TierSegmentGroup[] = [];
    const below = tierSegments.get(tier - 1);
    const above = tierSegments.get(tier + 1);

    if (below)
    {
        groups.push({ tier: tier - 1, segments: below });
    }

    if (above)
    {
        groups.push({ tier: tier + 1, segments: above });
    }

    return groups;
}

function generateTierSegments (tier: number, adjacentGroups: TierSegmentGroup[]): PlatformSegment[]
{
    const segmentSpacing = 20 + tier * 2;
    const rowOffset = tier * 4;
    const segments: PlatformSegment[] = [];

    for (let col = rowOffset; col < WORLD_MAP_COLS - 1; col += segmentSpacing)
    {
        const segmentLength = Math.floor(Math.random() * 6) + 1;

        if (col + segmentLength > WORLD_MAP_COLS)
        {
            continue;
        }

        const startCol = adjacentGroups.length === 0
            ? col
            : findValidStartCol(col, segmentLength, adjacentGroups);

        if (startCol === null)
        {
            continue;
        }

        const segment = { startCol, length: segmentLength };

        segments.push(segment);
    }

    return segments;
}

function createDefaultWorldMap (): WorldMap
{
    const map = createEmptyWorldMap();
    const groundRow = WORLD_MAP_ROWS - 1;

    for (let col = 0; col < WORLD_MAP_COLS; col++)
    {
        map[groundRow][col] = 1;
    }

    const platformTierSpacing = 4;
    const tiers: number[] = [];

    for (let tier = 1; tier <= FLOATING_TIER_COUNT; tier++)
    {
        const row = groundRow - tier * platformTierSpacing;

        if (row < 0)
        {
            break;
        }

        tiers.push(tier);
    }

    const tierSegments = new Map<number, PlatformSegment[]>();

    for (const tier of shuffleTiers(tiers))
    {
        const row = groundRow - tier * platformTierSpacing;
        const adjacentGroups = getAdjacentTierSegmentGroups(tier, tierSegments);
        const segments = generateTierSegments(tier, adjacentGroups);

        tierSegments.set(tier, segments);

        for (const segment of segments)
        {
            setPlatformRun(map, row, segment.startCol, segment.length);
        }
    }

    return map;
}

/** Row-major grid: `worldMap[row][col]` — 0 = empty, 1 = platform tile */
export const worldMap: WorldMap = createDefaultWorldMap();

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
