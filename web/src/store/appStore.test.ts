import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './appStore';
import { Tile, Socket } from '../types';

describe('AppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useAppStore.getState();
    store.tiles.clear();
    store.sockets.clear();
    store.setGeneratedGrid(null);
    store.setGenerationConfig({
      width: 16,
      height: 16,
      seed: undefined,
      retryOnFailure: false,
    });
  });

  describe('Tile Management', () => {
    it('should add a tile to the store', () => {
      const tile: Tile = {
        id: 'tile1',
        displayName: 'Test Tile',
        color: '#FF0000',
        weight: 5,
        sockets: {
          top: 'socket1',
          right: 'socket2',
          bottom: 'socket3',
          left: 'socket4',
        },
      };

      useAppStore.getState().addTile(tile);
      const tiles = useAppStore.getState().tiles;

      expect(tiles.has('tile1')).toBe(true);
      expect(tiles.get('tile1')).toEqual(tile);
    });

    it('should update a tile in the store', () => {
      const tile: Tile = {
        id: 'tile1',
        displayName: 'Test Tile',
        color: '#FF0000',
        weight: 5,
        sockets: {
          top: 'socket1',
          right: 'socket2',
          bottom: 'socket3',
          left: 'socket4',
        },
      };

      useAppStore.getState().addTile(tile);
      useAppStore.getState().updateTile('tile1', { displayName: 'Updated Tile', weight: 10 });

      const updatedTile = useAppStore.getState().tiles.get('tile1');
      expect(updatedTile?.displayName).toBe('Updated Tile');
      expect(updatedTile?.weight).toBe(10);
      expect(updatedTile?.color).toBe('#FF0000'); // Other properties unchanged
    });

    it('should delete a tile from the store', () => {
      const tile: Tile = {
        id: 'tile1',
        displayName: 'Test Tile',
        color: '#FF0000',
        weight: 5,
        sockets: {
          top: 'socket1',
          right: 'socket2',
          bottom: 'socket3',
          left: 'socket4',
        },
      };

      useAppStore.getState().addTile(tile);
      expect(useAppStore.getState().tiles.has('tile1')).toBe(true);

      useAppStore.getState().deleteTile('tile1');
      expect(useAppStore.getState().tiles.has('tile1')).toBe(false);
    });
  });

  describe('Socket Management', () => {
    it('should add a socket to the store', () => {
      const socket: Socket = {
        id: 'socket1',
        name: 'Grass Edge',
        color: '#00FF00',
      };

      useAppStore.getState().addSocket(socket);
      const sockets = useAppStore.getState().sockets;

      expect(sockets.has('socket1')).toBe(true);
      expect(sockets.get('socket1')).toEqual(socket);
    });

    it('should update a socket in the store', () => {
      const socket: Socket = {
        id: 'socket1',
        name: 'Grass Edge',
        color: '#00FF00',
      };

      useAppStore.getState().addSocket(socket);
      useAppStore.getState().updateSocket('socket1', { name: 'Water Edge', color: '#0000FF' });

      const updatedSocket = useAppStore.getState().sockets.get('socket1');
      expect(updatedSocket?.name).toBe('Water Edge');
      expect(updatedSocket?.color).toBe('#0000FF');
    });

    it('should delete a socket from the store', () => {
      const socket: Socket = {
        id: 'socket1',
        name: 'Grass Edge',
        color: '#00FF00',
      };

      useAppStore.getState().addSocket(socket);
      expect(useAppStore.getState().sockets.has('socket1')).toBe(true);

      useAppStore.getState().deleteSocket('socket1');
      expect(useAppStore.getState().sockets.has('socket1')).toBe(false);
    });
  });

  describe('Generation Configuration', () => {
    it('should update generation config', () => {
      useAppStore.getState().setGenerationConfig({
        width: 32,
        height: 64,
        seed: '12345',
        retryOnFailure: true,
      });

      const config = useAppStore.getState().generationConfig;
      expect(config.width).toBe(32);
      expect(config.height).toBe(64);
      expect(config.seed).toBe('12345');
      expect(config.retryOnFailure).toBe(true);
    });

    it('should partially update generation config', () => {
      useAppStore.getState().setGenerationConfig({ width: 32, height: 64 });
      useAppStore.getState().setGenerationConfig({ seed: '12345' });

      const config = useAppStore.getState().generationConfig;
      expect(config.width).toBe(32);
      expect(config.height).toBe(64);
      expect(config.seed).toBe('12345');
    });
  });

  describe('Generated Grid', () => {
    it('should set generated grid', () => {
      const gridData = { grid: ['1', '2', '3', '4'], width: 2, height: 2 };
      useAppStore.getState().setGeneratedGrid(gridData);

      const storedGrid = useAppStore.getState().generatedGrid;
      expect(storedGrid).toEqual(gridData);
    });

    it('should clear generated grid', () => {
      const gridData = { grid: ['1', '2', '3', '4'], width: 2, height: 2 };
      useAppStore.getState().setGeneratedGrid(gridData);
      expect(useAppStore.getState().generatedGrid).not.toBeNull();

      useAppStore.getState().setGeneratedGrid(null);
      expect(useAppStore.getState().generatedGrid).toBeNull();
    });
  });
});
