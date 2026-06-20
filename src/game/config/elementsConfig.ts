/** Platform tilemap render depth. */
export const PLATFORM_DEPTH = 10;

/** Render depth for tree decorations — above platforms (10), below starlights/player. */
export const TREE_DEPTH = 12;

/**
 * Layer offsets added to a character's feet Y for pseudo-3D draw order.
 * Larger feet Y (lower on screen / closer tier) renders in front.
 */
export const DEPTH_OFFSET_STARLIGHT = 0.12;
export const DEPTH_OFFSET_MURKLING = 0.15;
export const DEPTH_OFFSET_PROJECTILE = 0.18;
export const DEPTH_OFFSET_PLAYER = 0.2;
export const DEPTH_OFFSET_FIREBALL = 0.25;

/** World-space render depth from feet Y plus a small layer offset. */
export function worldDepthFromFeetY (feetY: number, layerOffset = 0): number
{
    return feetY + layerOffset;
}
