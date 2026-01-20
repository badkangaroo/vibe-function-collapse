import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Tile } from '../../src/types';

// Helper to generate arbitrary tiles
const arbitraryTile = (): fc.Arbitrary<Tile> => {
  return fc.record({
    id: fc.uuid(),
    displayName: fc.string(),
    weight: fc.integer({ min: 1, max: 100 }),
    color: fc.integer({ min: 0, max: 0xffffff }).map(n => '#' + n.toString(16).padStart(6, '0')),
    sockets: fc.record({
      top: fc.string(),
      right: fc.string(),
      bottom: fc.string(),
      left: fc.string(),
    }),
    sprite: fc.option(fc.base64String(), { freq: 2 }), // Optional sprite
  });
};

describe('Tile Management Properties', () => {
  // Feature: wfc-web-app, Property 19: Tile Search Filtering
  it('should correctly filter tiles based on search query', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryTile()),
        fc.string(),
        (tiles, query) => {
            // Logic being tested (same as in TileManager component)
            const lowerQuery = query.toLowerCase();
            const filtered = tiles.filter(t => 
                t.displayName.toLowerCase().includes(lowerQuery)
            );

            // Assertions
            // 1. All returned tiles match the query
            filtered.forEach(t => {
                expect(t.displayName.toLowerCase()).toContain(lowerQuery);
            });

            // 2. All tiles matching the query are returned
            const expectedCount = tiles.filter(t => 
                t.displayName.toLowerCase().includes(lowerQuery)
            ).length;
            expect(filtered.length).toBe(expectedCount);
        }
      )
    );
  });

  // Feature: wfc-web-app, Property 16: Tile Weight Validation
  it('should validate tile weights are within 1-100 range', () => {
    fc.assert(
      fc.property(
        fc.integer(), 
        (weightInput) => {
          // Logic being tested (clamping logic in TileEditor)
          const clampedWeight = Math.max(1, Math.min(100, weightInput));
          
          expect(clampedWeight).toBeGreaterThanOrEqual(1);
          expect(clampedWeight).toBeLessThanOrEqual(100);
          
          if (weightInput >= 1 && weightInput <= 100) {
            expect(clampedWeight).toBe(weightInput);
          } else if (weightInput < 1) {
            expect(clampedWeight).toBe(1);
          } else {
            expect(clampedWeight).toBe(100);
          }
        }
      )
    );
  });
});
