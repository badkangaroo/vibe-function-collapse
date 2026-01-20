import { Tile, SymmetryType, TileSocketAssignment } from '../types';

/**
 * Transform sockets based on rotation and reflection
 */
export interface SocketTransform {
  top: TileSocketAssignment[];
  right: TileSocketAssignment[];
  bottom: TileSocketAssignment[];
  left: TileSocketAssignment[];
}

/**
 * Rotate sockets clockwise by 90 degrees
 */
function rotateSocketsClockwise(sockets: SocketTransform): SocketTransform {
  return {
    top: sockets.left,
    right: sockets.top,
    bottom: sockets.right,
    left: sockets.bottom,
  };
}

/**
 * Reflect sockets horizontally (swap left/right)
 */
function reflectSocketsHorizontal(sockets: SocketTransform): SocketTransform {
  return {
    top: sockets.top,
    right: sockets.left,
    bottom: sockets.bottom,
    left: sockets.right,
  };
}

/**
 * Reflect sockets vertically (swap top/bottom)
 */
function reflectSocketsVertical(sockets: SocketTransform): SocketTransform {
  return {
    top: sockets.bottom,
    right: sockets.right,
    bottom: sockets.top,
    left: sockets.left,
  };
}

/**
 * Apply transformation to sockets based on rotation and reflection
 */
function transformSockets(
  sockets: SocketTransform,
  rotationDegrees: number,
  reflectH: boolean,
  reflectV: boolean
): SocketTransform {
  let result = { ...sockets };

  // Apply rotation
  for (let i = 0; i < rotationDegrees / 90; i++) {
    result = rotateSocketsClockwise(result);
  }

  // Apply reflections
  if (reflectH) {
    result = reflectSocketsHorizontal(result);
  }
  if (reflectV) {
    result = reflectSocketsVertical(result);
  }

  return result;
}

/**
 * Get transformations for a symmetry type
 * Returns array of (rotation_degrees, reflect_horizontal, reflect_vertical)
 */
function getSymmetryTransformations(symmetry: SymmetryType): Array<[number, boolean, boolean]> {
  switch (symmetry) {
    case 'X':
      return [[0, false, false]];
    case 'I':
      return [[0, false, false], [0, true, false]];
    case 'T':
      return [[0, false, false], [90, false, false], [180, false, false], [270, false, false]];
    case 'L':
      return [[0, false, false], [90, false, false], [180, false, false], [270, false, false]];
    case '\\':
      return [[0, false, false], [0, true, true]];
    case 'F':
      return [
        [0, false, false], [90, false, false], [180, false, false], [270, false, false],
        [0, true, false], [90, true, false], [180, true, false], [270, true, false],
      ];
    case 'N':
      return [
        [0, false, false], [90, false, false], [180, false, false], [270, false, false],
        [0, true, false], [90, true, false], [180, true, false], [270, true, false],
      ];
  }
}

/**
 * Generate variant tiles from a base tile with symmetry
 * Returns a map of variant ID -> variant tile
 */
export function generateTileVariants(baseTile: Tile): Map<string, Tile> {
  const variants = new Map<string, Tile>();

  // If no symmetry, just return the base tile
  if (!baseTile.symmetry) {
    variants.set(baseTile.id, baseTile);
    return variants;
  }

  const transformations = getSymmetryTransformations(baseTile.symmetry);

  transformations.forEach(([rotation, reflectH, reflectV], index) => {
    const transformedSockets = transformSockets(
      baseTile.sockets,
      rotation,
      reflectH,
      reflectV
    );

    // Generate variant ID
    // For base variant (index 0), use original ID; otherwise append suffix
    const variantId = index === 0 
      ? baseTile.id 
      : `${baseTile.id}_${rotation}${reflectH ? 'h' : ''}${reflectV ? 'v' : ''}`;

    const variant: Tile = {
      id: variantId,
      displayName: `${baseTile.displayName}${index === 0 ? '' : ` (${rotation}°${reflectH ? ' H' : ''}${reflectV ? ' V' : ''})`}`,
      sprite: baseTile.sprite,
      color: baseTile.color,
      weight: baseTile.weight,
      sockets: transformedSockets,
      symmetry: undefined, // Variants don't have symmetry themselves
    };

    variants.set(variantId, variant);
  });

  return variants;
}

/**
 * Generate all tile variants from a map of base tiles
 * Returns expanded map with all variants
 */
export function expandTilesWithSymmetry(tiles: Map<string, Tile>): Map<string, Tile> {
  const expanded = new Map<string, Tile>();

  for (const baseTile of tiles.values()) {
    const variants = generateTileVariants(baseTile);
    for (const [variantId, variant] of variants) {
      expanded.set(variantId, variant);
    }
  }

  return expanded;
}
