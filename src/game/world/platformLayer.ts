import { Scene } from 'phaser';
import {
    CELL_PLATFORM,
    TILE_HEIGHT,
    TILE_WIDTH,
    WORLD_MAP_COLS,
    WORLD_MAP_ROWS,
    type WorldMap
} from './worldMap';

/** Tile index in the platform tileset (blank maps use firstgid 0). */
export const PLATFORM_TILE_INDEX = 0;

/** Batched platform visuals + arcade collision from the world grid. */
export function createPlatformLayer (
    scene: Scene,
    map: WorldMap,
    depth = 10
): Phaser.Tilemaps.TilemapLayer
{
    const tilemap = scene.make.tilemap({
        tileWidth: TILE_WIDTH,
        tileHeight: TILE_HEIGHT,
        width: WORLD_MAP_COLS,
        height: WORLD_MAP_ROWS
    });

    const tileset = tilemap.addTilesetImage(
        'platform-tile-11',
        'platform-tile-11',
        TILE_WIDTH,
        TILE_HEIGHT
    );

    if (!tileset)
    {
        throw new Error('Failed to load platform tileset');
    }

    const layer = tilemap.createBlankLayer(
        'platforms',
        tileset,
        0,
        0,
        WORLD_MAP_COLS,
        WORLD_MAP_ROWS
    );

    if (!layer)
    {
        throw new Error('Failed to create platform layer');
    }

    const data: number[][] = [];

    for (let row = 0; row < WORLD_MAP_ROWS; row++)
    {
        const rowData: number[] = [];

        for (let col = 0; col < WORLD_MAP_COLS; col++)
        {
            rowData.push(map[row][col] === CELL_PLATFORM ? PLATFORM_TILE_INDEX : -1);
        }

        data.push(rowData);
    }

    layer.putTilesAt(data, 0, 0);
    layer.setDepth(depth);
    tilemap.setCollision(PLATFORM_TILE_INDEX, true, true, layer);

    return layer;
}
