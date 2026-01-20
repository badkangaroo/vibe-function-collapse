import { describe, it, expect } from 'vitest';
import { WasmBridge } from './wasmBridge';
import { Tile } from '../types';

describe('WasmBridge Utility', () => {
  // Mock tiles
  const createTile = (id: string, sockets: { top: string, right: string, bottom: string, left: string }, weight = 1): Tile => ({
    id,
    displayName: id,
    weight,
    sockets
  });

  const tileA = createTile('A', { top: 'a', right: 'a', bottom: 'a', left: 'a' });
  const tileB = createTile('B', { top: 'b', right: 'b', bottom: 'b', left: 'b' });
  const tileVertical = createTile('V', { top: 'a', right: 'b', bottom: 'a', left: 'b' });

  it('generateRulesFromSockets should find matching sockets', () => {
    const tiles = new Map<string, Tile>();
    tiles.set(tileA.id, tileA);
    tiles.set(tileB.id, tileB);

    const rules = WasmBridge.generateRulesFromSockets(tiles);

    // A should connect to A (all 'a' sockets)
    expect(rules).toContainEqual({ from: 'A', to: 'A', direction: 'Up' });
    expect(rules).toContainEqual({ from: 'A', to: 'A', direction: 'Down' });
    expect(rules).toContainEqual({ from: 'A', to: 'A', direction: 'Left' });
    expect(rules).toContainEqual({ from: 'A', to: 'A', direction: 'Right' });

    // A should NOT connect to B
    expect(rules).not.toContainEqual({ from: 'A', to: 'B', direction: 'Up' });
  });

  it('generateRulesFromSockets should handle complex connections', () => {
    const tiles = new Map<string, Tile>();
    tiles.set(tileA.id, tileA);
    tiles.set(tileVertical.id, tileVertical);

    const rules = WasmBridge.generateRulesFromSockets(tiles);

    // V (top: a) matches A (bottom: a) -> V Up A ? No, V.top connects to neighbor's bottom.
    // If V is at (x,y), neighbor at (x, y-1) (Up).
    // V.top == Neighbor.bottom
    // V.top = 'a', A.bottom = 'a'. Match!
    expect(rules).toContainEqual({ from: 'V', to: 'A', direction: 'Up' });

    // A (top: a) matches V (bottom: a)
    expect(rules).toContainEqual({ from: 'A', to: 'V', direction: 'Up' });
  });

  it('convertToRulesJson should produce valid JSON structure', () => {
    const tiles = new Map<string, Tile>();
    tiles.set(tileA.id, tileA);

    const json = WasmBridge.convertToRulesJson(tiles);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty('tiles');
    expect(parsed).toHaveProperty('rules');
    expect(parsed.tiles).toHaveLength(1);
    expect(parsed.tiles[0]).toEqual({ id: 'A', weight: 1 });
    expect(parsed.rules.length).toBeGreaterThan(0);
  });
});
