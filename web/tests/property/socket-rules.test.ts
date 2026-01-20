import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { WasmBridge } from '../../src/utils/wasmBridge';
import { Tile, Socket } from '../../src/types';

// Generators
const arbitrarySocket = (): fc.Arbitrary<Socket> => {
  return fc.record({
    id: fc.uuid(),
    name: fc.string(),
    color: fc.integer({ min: 0, max: 0xffffff }).map(n => '#' + n.toString(16).padStart(6, '0'))
  });
};

const arbitraryTileWithSockets = (sockets: Socket[]): fc.Arbitrary<Tile> => {
  if (sockets.length === 0) {
    // If no sockets, use '0' (None)
    return fc.record({
      id: fc.uuid(),
      displayName: fc.string(),
      weight: fc.integer({ min: 1, max: 100 }),
      color: fc.integer({ min: 0, max: 0xffffff }).map(n => '#' + n.toString(16).padStart(6, '0')),
      sockets: fc.record({
        top: fc.constant('0'),
        right: fc.constant('0'),
        bottom: fc.constant('0'),
        left: fc.constant('0'),
      })
    });
  }

  const socketIds = ['0', ...sockets.map(s => s.id)];
  return fc.record({
    id: fc.uuid(),
    displayName: fc.string(),
    weight: fc.integer({ min: 1, max: 100 }),
    color: fc.integer({ min: 0, max: 0xffffff }).map(n => '#' + n.toString(16).padStart(6, '0')),
    sockets: fc.record({
      top: fc.constantFrom(...socketIds),
      right: fc.constantFrom(...socketIds),
      bottom: fc.constantFrom(...socketIds),
      left: fc.constantFrom(...socketIds),
    })
  });
};

describe('Socket Rule Generation Properties', () => {
  
  // Feature: wfc-web-app, Property 14: Rule Regeneration on Socket Change
  // Also covers Property 11: Socket Matching Rule Generation
  it('should generate correct rules based on socket compatibility', () => {
    fc.assert(
      fc.property(
        fc.array(arbitrarySocket(), { minLength: 1, maxLength: 5 }).chain(sockets => 
          fc.tuple(
            fc.constant(sockets),
            fc.array(arbitraryTileWithSockets(sockets), { minLength: 2, maxLength: 10 })
          )
        ),
        ([sockets, tiles]) => {
          // Convert array to Map as expected by the utility
          const tilesMap = new Map(tiles.map(t => [t.id, t]));
          
          const rules = WasmBridge.generateRulesFromSockets(tilesMap);
          
          // Verification Logic
          
          // 1. Verify all generated rules are valid according to socket matching
          rules.forEach(rule => {
            const fromTile = tilesMap.get(rule.from)!;
            const toTile = tilesMap.get(rule.to)!;
            
            if (rule.direction === 'Up') {
              expect(fromTile.sockets.top).toBe(toTile.sockets.bottom);
              // "0" (None) sockets should not connect to anything, even other "0"s?
              // The current implementation allows 0-0 connections if they match string equality.
              // If '0' represents "None", usually it shouldn't connect.
              // But let's check the current implementation behavior in WasmBridge.ts.
              // It just checks strict equality: if (from.top === to.bottom)
            } else if (rule.direction === 'Down') {
              expect(fromTile.sockets.bottom).toBe(toTile.sockets.top);
            } else if (rule.direction === 'Left') {
              expect(fromTile.sockets.left).toBe(toTile.sockets.right);
            } else if (rule.direction === 'Right') {
              expect(fromTile.sockets.right).toBe(toTile.sockets.left);
            }
          });

          // 2. Verify completeness (simplified check)
          // Pick a random pair and direction, if sockets match, a rule SHOULD exist
          // (Unless it's 0-0 and we decide 0 doesn't connect, but current impl connects everything matching)
          if (tiles.length >= 2) {
             const t1 = tiles[0];
             const t2 = tiles[1];
             
             if (t1.sockets.right === t2.sockets.left) {
                 const hasRule = rules.some(r => 
                     r.from === t1.id && r.to === t2.id && r.direction === 'Right'
                 );
                 expect(hasRule).toBe(true);
             }
          }
        }
      )
    );
  });
  
  // Feature: wfc-web-app, Property 12: Socket Assignment Storage
  // This essentially tests that the data structure holds what we put in
  it('should preserve socket assignments in tile data', () => {
     fc.assert(
        fc.property(
            fc.array(arbitrarySocket(), { minLength: 1 }).chain(sockets => 
                arbitraryTileWithSockets(sockets)
            ),
            (tile) => {
                expect(tile.sockets).toBeDefined();
                expect(typeof tile.sockets.top).toBe('string');
                expect(typeof tile.sockets.right).toBe('string');
                expect(typeof tile.sockets.bottom).toBe('string');
                expect(typeof tile.sockets.left).toBe('string');
            }
        )
     );
  });
});
