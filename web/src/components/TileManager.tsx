import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { Tile, Socket } from '../types';
import TileEditor from './TileEditor';

const TileManager: React.FC = () => {
  const { tiles, addTile, updateTile, deleteTile, addSocket } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTile, setEditingTile] = useState<Tile | null>(null);

  const tilesList = useMemo(() => Array.from(tiles.values()), [tiles]);

  const existingSprites = useMemo(() => {
    const sprites = new Set<string>();
    tilesList.forEach(tile => {
      if (tile.sprite) {
        sprites.add(tile.sprite);
      }
    });
    return Array.from(sprites);
  }, [tilesList]);

  const filteredTiles = useMemo(() => {
    if (!searchQuery.trim()) return tilesList;
    const lowerQuery = searchQuery.toLowerCase();
    return tilesList.filter((tile) =>
      tile.displayName.toLowerCase().includes(lowerQuery)
    );
  }, [tilesList, searchQuery]);

  const handleAddClick = () => {
    setEditingTile(null);
    setIsEditorOpen(true);
  };

  const handleEditClick = (tile: Tile) => {
    setEditingTile(tile);
    setIsEditorOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Are you sure you want to delete this tile? This will also remove any rules associated with it.')) {
      deleteTile(id);
    }
  };

  const handleSaveTile = (tile: Tile) => {
    if (editingTile) {
      updateTile(tile.id, tile);
    } else {
      addTile(tile);
      // Automatically create a socket for the new tile to facilitate connection
      const newSocket: Socket = {
        id: crypto.randomUUID(),
        name: tile.displayName,
        color: tile.color || '#cccccc',
      };
      addSocket(newSocket);
    }
  };

  return (
    <div className="tile-manager">
      <div className="tile-manager-controls">
        <input
          type="text"
          placeholder="Search tiles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button className="btn btn-primary btn-sm" onClick={handleAddClick}>
          + New Tile
        </button>
      </div>

      <div className="tile-stats">
        <span>{filteredTiles.length} tile{filteredTiles.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="tile-grid">
        {filteredTiles.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? 'No matching tiles found' : 'No tiles yet. Create one to get started!'}
          </div>
        ) : (
          filteredTiles.map((tile) => (
            <div key={tile.id} className="tile-card" onClick={() => handleEditClick(tile)}>
              <div className="tile-preview">
                {tile.sprite ? (
                  <img src={tile.sprite} alt={tile.displayName} />
                ) : (
                  <div 
                    className="tile-color-preview" 
                    style={{ backgroundColor: tile.color || '#ccc' }}
                  />
                )}
              </div>
              <div className="tile-info">
                <span className="tile-name">{tile.displayName}</span>
                <span className="tile-weight" title="Weight">w: {tile.weight}</span>
              </div>
              <button 
                className="delete-tile-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(tile.id);
                }}
                title="Delete tile"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <TileEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveTile}
        initialTile={editingTile}
        existingSprites={existingSprites}
      />
    </div>
  );
};

export default TileManager;