import { create } from 'zustand';
import { Tile, Socket, GenerationConfig, Notification } from '../types';

/**
 * Application state interface
 */
export interface AppState {
  // Tile management
  tiles: Map<string, Tile>;
  addTile: (tile: Tile) => void;
  updateTile: (id: string, updates: Partial<Tile>) => void;
  deleteTile: (id: string) => void;

  // Socket management
  sockets: Map<string, Socket>;
  addSocket: (socket: Socket) => void;
  updateSocket: (id: string, updates: Partial<Socket>) => void;
  deleteSocket: (id: string) => void;

  // Generation configuration and results
  generationConfig: GenerationConfig;
  setGenerationConfig: (config: Partial<GenerationConfig>) => void;
  generatedGrid: { grid: string[]; width: number; height: number } | null;
  setGeneratedGrid: (grid: { grid: string[]; width: number; height: number } | null) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (message: string, type: Notification['type']) => void;
  removeNotification: (id: string) => void;
}

/**
 * Create the Zustand store for application state management
 */
export const useAppStore = create<AppState>((set) => ({
  // Initial state - Tile management
  tiles: new Map<string, Tile>(),

  /**
   * Add a new tile to the store
   * Requirements: 1.1
   */
  addTile: (tile: Tile) =>
    set((state) => {
      const newTiles = new Map(state.tiles);
      newTiles.set(tile.id, tile);
      return { tiles: newTiles };
    }),

  /**
   * Update an existing tile's properties
   * Requirements: 1.5
   */
  updateTile: (id: string, updates: Partial<Tile>) =>
    set((state) => {
      const newTiles = new Map(state.tiles);
      const existingTile = newTiles.get(id);
      if (existingTile) {
        newTiles.set(id, { ...existingTile, ...updates });
      }
      return { tiles: newTiles };
    }),

  /**
   * Delete a tile and all associated rules
   * Requirements: 1.6
   */
  deleteTile: (id: string) =>
    set((state) => {
      const newTiles = new Map(state.tiles);
      newTiles.delete(id);
      return { tiles: newTiles };
    }),

  // Initial state - Socket management
  sockets: new Map<string, Socket>(),

  /**
   * Add a new socket to the store
   * Requirements: 3.1
   */
  addSocket: (socket: Socket) =>
    set((state) => {
      const newSockets = new Map(state.sockets);
      newSockets.set(socket.id, socket);
      return { sockets: newSockets };
    }),

  /**
   * Update an existing socket's properties
   * Requirements: 3.2
   */
  updateSocket: (id: string, updates: Partial<Socket>) =>
    set((state) => {
      const newSockets = new Map(state.sockets);
      const existingSocket = newSockets.get(id);
      if (existingSocket) {
        newSockets.set(id, { ...existingSocket, ...updates });
      }
      return { sockets: newSockets };
    }),

  /**
   * Delete a socket from the store
   * Requirements: 3.2
   */
  deleteSocket: (id: string) =>
    set((state) => {
      const newSockets = new Map(state.sockets);
      newSockets.delete(id);
      return { sockets: newSockets };
    }),

  // Initial state - Generation configuration
  generationConfig: {
    width: 16,
    height: 16,
    seed: undefined,
    retryOnFailure: false,
  },

  /**
   * Update generation configuration
   * Requirements: 6.1
   */
  setGenerationConfig: (config: Partial<GenerationConfig>) =>
    set((state) => ({
      generationConfig: { ...state.generationConfig, ...config },
    })),

  // Initial state - Generated grid
  generatedGrid: null,

  /**
   * Set the generated grid result
   * Requirements: 7.6
   */
  setGeneratedGrid: (grid: { grid: string[]; width: number; height: number } | null) =>
    set({ generatedGrid: grid }),

  // Initial state - Notifications
  notifications: [],

  /**
   * Add a notification
   * Requirements: 9.1, 9.2, 9.3
   */
  addNotification: (message: string, type: Notification['type']) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id: crypto.randomUUID(),
          message,
          type,
          timestamp: Date.now(),
        },
      ],
    })),

  /**
   * Remove a notification by ID
   */
  removeNotification: (id: string) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
