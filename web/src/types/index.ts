/**
 * Core type definitions for the WFC Web Application
 */

/**
 * Represents a socket type for tile edge matching
 */
export interface Socket {
  id: string;
  name: string;
  color: string;
}

/**
 * Represents a socket assignment on a tile edge
 */
export interface TileSocketAssignment {
  socketId: string;
  weight?: number;
}

/**
 * Configuration for map generation
 */
export interface GenerationConfig {
  width: number;
  height: number;
  seed?: string;
  retryOnFailure: boolean;
}

/**
 * Direction enum for adjacency rules
 */
export type Direction = 'Up' | 'Down' | 'Left' | 'Right';

/**
 * Symmetry type for tile rotation/reflection
 * Based on the original WFC symmetry system:
 * - 'X': Full symmetry (all rotations and reflections are identical)
 * - 'I': Horizontal/vertical reflection symmetry (2 variants)
 * - 'T': T-shaped symmetry (4 variants)
 * - 'L': L-shaped symmetry (4 variants)
 * - '\\': Diagonal reflection symmetry (2 variants)
 * - 'F': F-shaped symmetry (8 variants - all rotations and reflections)
 * - 'N': No symmetry (8 variants - all rotations and reflections)
 */
export type SymmetryType = 'X' | 'I' | 'T' | 'L' | '\\' | 'F' | 'N';

/**
 * Represents a tile with visual representation and properties
 */
export interface Tile {
  id: string;
  displayName: string;
  sprite?: string; // base64 or URL
  color?: string;
  weight: number;
  sockets: {
    top: TileSocketAssignment[];
    right: TileSocketAssignment[];
    bottom: TileSocketAssignment[];
    left: TileSocketAssignment[];
  };
  symmetry?: SymmetryType; // Optional symmetry type for automatic rotation/reflection
}

/**
 * Represents a saved project with all tiles, rules, and settings
 */
export interface Project {
  version: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  tiles: Tile[];
  sockets: Socket[];
  config: GenerationConfig;
  thumbnail?: string; // base64 preview
}

/**
 * Adjacency rule for tile placement
 */
export interface Rule {
  from: string;
  to: string;
  direction: Direction;
}

/**
 * Generation statistics
 */
export interface GenerationStats {
  timeTaken: number;
  iterations: number;
  tilesUsed: Set<string>;
}

/**
 * Notification type for user feedback
 */
export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}
