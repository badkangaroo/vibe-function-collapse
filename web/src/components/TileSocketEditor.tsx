import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Tile, Socket, Direction, TileSocketAssignment } from '../types';

const DIRECTIONS: Direction[] = ['Up', 'Right', 'Down', 'Left'];

// Helper to map Direction to socket key
const dirToKey = (dir: Direction): keyof Tile['sockets'] => {
  switch (dir) {
    case 'Up': return 'top';
    case 'Down': return 'bottom';
    case 'Left': return 'left';
    case 'Right': return 'right';
  }
};

const MultiSocketSelector: React.FC<{
  assignments: TileSocketAssignment[];
  allSockets: Socket[];
  onChange: (newAssignments: TileSocketAssignment[]) => void;
  direction: string;
}> = ({ assignments, allSockets, onChange, direction }) => {
  const [isAdding, setIsAdding] = useState(false);
  
  const handleAdd = (socketId: string) => {
    if (socketId === '0') return;
    // Check if already exists
    if (assignments.some(a => a.socketId === socketId)) return;
    
    onChange([...assignments, { socketId, weight: 1 }]);
    setIsAdding(false);
  };

  const handleRemove = (socketId: string) => {
    onChange(assignments.filter(a => a.socketId !== socketId));
  };

  const handleWeightChange = (socketId: string, weight: number) => {
    onChange(assignments.map(a => 
      a.socketId === socketId ? { ...a, weight } : a
    ));
  };

  const availableSockets = allSockets.filter(s => 
    !assignments.some(a => a.socketId === s.id)
  );

  const getSocketColor = (id: string) => {
    return allSockets.find(s => s.id === id)?.color || '#333';
  };

  return (
    <div className={`multi-socket-selector ${direction}`}>
      <div className="socket-list">
        {assignments.map(assign => {
          const socket = allSockets.find(s => s.id === assign.socketId);
          if (!socket) return null;
          
          return (
            <div key={assign.socketId} className="socket-tag" style={{ borderColor: socket.color }}>
              <div 
                className="socket-color-dot" 
                style={{ backgroundColor: socket.color }} 
              />
              <span className="socket-name">{socket.name}</span>
              <input 
                type="number" 
                className="socket-weight-input"
                min="0.1" 
                step="0.1"
                value={assign.weight || 1} 
                onChange={(e) => handleWeightChange(assign.socketId, parseFloat(e.target.value))}
                title="Connection Weight"
              />
              <button 
                className="remove-socket-btn"
                onClick={() => handleRemove(assign.socketId)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      
      {availableSockets.length > 0 && (
        <div className="add-socket-container">
          <select 
            className="add-socket-select"
            onChange={(e) => handleAdd(e.target.value)}
            value="0"
          >
            <option value="0">+ Add Socket...</option>
            {availableSockets.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

const TileSocketCard: React.FC<{
  tile: Tile;
  sockets: Map<string, Socket>;
  onUpdate: (id: string, updates: Partial<Tile>) => void;
}> = ({ tile, sockets, onUpdate }) => {
  const socketsArray = Array.from(sockets.values());

  const handleSocketChange = (key: keyof Tile['sockets'], newAssignments: TileSocketAssignment[]) => {
    onUpdate(tile.id, {
      sockets: {
        ...tile.sockets,
        [key]: newAssignments
      }
    });
  };

  return (
    <div className="tile-socket-card">
      <div className="socket-controls">
        {/* Top Socket */}
        <div className="socket-position top">
          <MultiSocketSelector 
            assignments={tile.sockets.top}
            allSockets={socketsArray}
            onChange={(newA) => handleSocketChange('top', newA)}
            direction="top"
          />
        </div>

        <div className="middle-row">
          {/* Left Socket */}
          <div className="socket-position left">
            <MultiSocketSelector 
              assignments={tile.sockets.left}
              allSockets={socketsArray}
              onChange={(newA) => handleSocketChange('left', newA)}
              direction="left"
            />
          </div>

          {/* Tile Preview */}
          <div className="tile-center-preview">
            {tile.sprite ? (
              <img src={tile.sprite} alt={tile.displayName} />
            ) : (
              <div 
                className="color-box" 
                style={{ backgroundColor: tile.color || '#ccc' }} 
              />
            )}
            <span className="tile-label">{tile.displayName}</span>
          </div>

          {/* Right Socket */}
          <div className="socket-position right">
            <MultiSocketSelector 
              assignments={tile.sockets.right}
              allSockets={socketsArray}
              onChange={(newA) => handleSocketChange('right', newA)}
              direction="right"
            />
          </div>
        </div>

        {/* Bottom Socket */}
        <div className="socket-position bottom">
          <MultiSocketSelector 
            assignments={tile.sockets.bottom}
            allSockets={socketsArray}
            onChange={(newA) => handleSocketChange('bottom', newA)}
            direction="bottom"
          />
        </div>
      </div>
    </div>
  );
};

const TileSocketEditor: React.FC = () => {
  const { tiles, sockets, updateTile } = useAppStore();
  const tilesList = useMemo(() => Array.from(tiles.values()), [tiles]);

  if (tilesList.length === 0) {
    return <div className="empty-text">No tiles available. Create tiles in Tile Manager first.</div>;
  }

  return (
    <div className="tile-socket-editor">
      {tilesList.map(tile => (
        <TileSocketCard
          key={tile.id}
          tile={tile}
          sockets={sockets}
          onUpdate={updateTile}
        />
      ))}
    </div>
  );
};

export default TileSocketEditor;
