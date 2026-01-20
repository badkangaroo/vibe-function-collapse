# Application State Management

This directory contains the Zustand store for managing application state.

## Store Structure

The `appStore.ts` file defines the main application state with the following sections:

### Tile Management
- `tiles`: Map of tile ID to Tile objects
- `addTile(tile)`: Add a new tile
- `updateTile(id, updates)`: Update tile properties
- `deleteTile(id)`: Remove a tile

### Socket Management
- `sockets`: Map of socket ID to Socket objects
- `addSocket(socket)`: Add a new socket
- `updateSocket(id, updates)`: Update socket properties
- `deleteSocket(id)`: Remove a socket

### Generation Configuration
- `generationConfig`: Current generation settings (width, height, seed, retryOnFailure)
- `setGenerationConfig(config)`: Update generation settings

### Generated Grid
- `generatedGrid`: The result of WFC generation ({ grid: string[], width: number, height: number } | null)
- `setGeneratedGrid(grid)`: Set the generated grid

## Usage Example

```typescript
import { useAppStore } from './store/appStore';

function TileManager() {
  // Access state and actions
  const tiles = useAppStore((state) => state.tiles);
  const addTile = useAppStore((state) => state.addTile);
  const updateTile = useAppStore((state) => state.updateTile);
  const deleteTile = useAppStore((state) => state.deleteTile);

  const handleAddTile = () => {
    const newTile = {
      id: 'tile-' + Date.now(),
      displayName: 'New Tile',
      color: '#FF0000',
      weight: 5,
      sockets: {
        top: 'socket1',
        right: 'socket2',
        bottom: 'socket3',
        left: 'socket4',
      },
    };
    addTile(newTile);
  };

  return (
    <div>
      <button onClick={handleAddTile}>Add Tile</button>
      <div>
        {Array.from(tiles.values()).map((tile) => (
          <div key={tile.id}>
            {tile.displayName}
            <button onClick={() => updateTile(tile.id, { weight: tile.weight + 1 })}>
              Increase Weight
            </button>
            <button onClick={() => deleteTile(tile.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Testing

Tests are located in `appStore.test.ts` and cover:
- Tile CRUD operations
- Socket CRUD operations
- Generation configuration updates
- Generated grid storage

Run tests with:
```bash
npm run test:run
```
