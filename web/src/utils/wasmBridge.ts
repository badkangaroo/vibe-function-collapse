import init, { WfcModel } from 'wfc-core';
import { Tile, Rule, GenerationConfig } from '../types';
import { expandTilesWithSymmetry } from './symmetry';

/**
 * Utility class to interface with the Wasm WFC core
 */
export class WasmBridge {
  private static initialized = false;

  /**
   * Initialize the Wasm module.
   * This should be called once at app startup.
   */
  static async initialize(): Promise<void> {
    if (!this.initialized) {
      await init();
      this.initialized = true;
    }
  }

  /**
   * Run the WFC algorithm to generate a map
   */
  static async generate(
    tiles: Map<string, Tile>,
    config: GenerationConfig
  ): Promise<string[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const rulesJson = this.convertToRulesJson(tiles);

    // Create WfcModel instance
    // Note: Seed needs to be BigInt or undefined
    const seedBigInt = config.seed ? BigInt(hashString(config.seed)) : undefined;

    // We use a try-catch block because Wasm errors throw exceptions
    try {
      const model = new WfcModel(config.width, config.height, seedBigInt);

      try {
        model.load_rules(rulesJson);

        const success = model.run();

        if (!success) {
          throw new Error('Generation failed: Contradiction reached (no valid solution found with current rules and seed)');
        }

        // Get the result grid (array of tile IDs)
        // The Wasm binding returns JsValue which is compatible with string[]
        return model.get_grid();
      } finally {
        // Clean up Wasm memory
        model.free();
      }
    } catch (e: any) {
      // Re-throw with clear message
      throw new Error(e.toString() || 'Unknown Wasm error');
    }
  }

  /**
   * Convert UI state (Tiles map) to the JSON format expected by the Rust core
   */
  static convertToRulesJson(tiles: Map<string, Tile>): string {
    // Expand tiles with symmetry variants
    const expandedTiles = expandTilesWithSymmetry(tiles);
    const tileList = Array.from(expandedTiles.values());

    // Convert tiles to simple objects with id and weight
    const simpleTiles = tileList.map(t => ({
      id: t.id,
      weight: t.weight
    }));

    // Generate rules from sockets (using expanded tiles with variants)
    const rules = this.generateRulesFromSockets(expandedTiles);

    return JSON.stringify({
      tiles: simpleTiles,
      rules: rules
    });
  }

  /**
   * Check if two lists of sockets have any common socket ID
   */
  private static socketsMatch(list1: any, list2: any): boolean {
    // 1. Handle new array format
    if (Array.isArray(list1) && Array.isArray(list2)) {
      return list1.some((s1: any) => {
        const id1 = typeof s1 === 'object' ? s1.socketId : s1;
        if (id1 === '0' || id1 === '') return false;

        return list2.some((s2: any) => {
          const id2 = typeof s2 === 'object' ? s2.socketId : s2;
          if (id2 === '0' || id2 === '') return false;
          return id1 === id2;
        });
      });
    }

    // 2. Handle legacy string format for backward compatibility and tests
    if (typeof list1 === 'string' && typeof list2 === 'string') {
      if (list1 === '0' || list1 === '' || list2 === '0' || list2 === '') return false;
      return list1 === list2;
    }

    return false;
  }

  /**
   * Generate adjacency rules by checking compatible sockets
   */
  static generateRulesFromSockets(tiles: Map<string, Tile>): Rule[] {
    const rules: Rule[] = [];
    const tileList = Array.from(tiles.values());

    for (const fromTile of tileList) {
      for (const toTile of tileList) {
        // Check all 4 directions

        // UP: From Top matches To Bottom
        if (this.socketsMatch(fromTile.sockets.top, toTile.sockets.bottom)) {
          rules.push({ from: fromTile.id, to: toTile.id, direction: 'Up' });
        }

        // DOWN: From Bottom matches To Top
        if (this.socketsMatch(fromTile.sockets.bottom, toTile.sockets.top)) {
          rules.push({ from: fromTile.id, to: toTile.id, direction: 'Down' });
        }

        // LEFT: From Left matches To Right
        if (this.socketsMatch(fromTile.sockets.left, toTile.sockets.right)) {
          rules.push({ from: fromTile.id, to: toTile.id, direction: 'Left' });
        }

        // RIGHT: From Right matches To Left
        if (this.socketsMatch(fromTile.sockets.right, toTile.sockets.left)) {
          rules.push({ from: fromTile.id, to: toTile.id, direction: 'Right' });
        }
      }
    }

    return rules;
  }
}

// Simple string hashing for seed if user provides string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
