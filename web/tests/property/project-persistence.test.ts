import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { StorageUtil } from '../../src/utils/storage';
import { Project } from '../../src/types';
import 'fake-indexeddb/auto'; // Automatically mocks global indexedDB

// Arbitrary generators for Project data
const arbitraryProject = (): fc.Arbitrary<Project> => {
  return fc.record({
    version: fc.constant('1.0.0'),
    name: fc.string({ minLength: 1 }).map(s => s.replace(/[^a-z0-9]/gi, '_')), // Safe names for keys
    createdAt: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-01-01') }).map(d => d.toISOString()),
    modifiedAt: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-01-01') }).map(d => d.toISOString()),
    tiles: fc.array(fc.record({
      id: fc.uuid(),
      displayName: fc.string(),
      weight: fc.integer({ min: 1, max: 100 }),
      color: fc.integer({ min: 0, max: 0xffffff }).map(n => '#' + n.toString(16).padStart(6, '0')),
      sockets: fc.record({
        top: fc.string(),
        right: fc.string(),
        bottom: fc.string(),
        left: fc.string(),
      })
    })),
    sockets: fc.array(fc.record({
      id: fc.uuid(),
      name: fc.string(),
      color: fc.integer({ min: 0, max: 0xffffff }).map(n => '#' + n.toString(16).padStart(6, '0'))
    })),
    config: fc.record({
      width: fc.integer({ min: 1, max: 100 }),
      height: fc.integer({ min: 1, max: 100 }),
      seed: fc.option(fc.string()),
      retryOnFailure: fc.boolean()
    }),
    thumbnail: fc.option(fc.base64String())
  });
};

describe('Project Persistence Properties', () => {
  // Feature: wfc-web-app, Property 42: Project Save/Load Round-Trip
  it('should preserve all data through save/load cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryProject(),
        async (project) => {
          // Save
          await StorageUtil.saveProject(project);

          // Load
          const loaded = await StorageUtil.loadProject(project.name);

          // Verify
          expect(loaded).toEqual(project);
        }
      ),
      { numRuns: 20 } // Async tests can be slow with DB, limit runs
    );
  });

  // Feature: wfc-web-app, Property 44: Project Deletion Completeness
  it('should remove project from storage on delete', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryProject(),
        async (project) => {
          await StorageUtil.saveProject(project);
          await StorageUtil.deleteProject(project.name);
          const loaded = await StorageUtil.loadProject(project.name);
          expect(loaded).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });
});
