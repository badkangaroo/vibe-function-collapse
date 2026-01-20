import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { Socket } from '../types';

const SocketManager: React.FC = () => {
  const { sockets, addSocket, updateSocket, deleteSocket } = useAppStore();
  const [editingSocketId, setEditingSocketId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('#000000');

  const socketsList = useMemo(() => Array.from(sockets.values()), [sockets]);

  const handleEdit = (socket: Socket) => {
    setEditingSocketId(socket.id);
    setName(socket.name);
    setColor(socket.color);
  };

  const handleCancel = () => {
    setEditingSocketId(null);
    setName('');
    setColor('#000000');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this socket? Tiles using it will keep the ID but it will no longer be valid.')) {
      deleteSocket(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSocketId) {
      updateSocket(editingSocketId, { name, color });
    } else {
      addSocket({
        id: crypto.randomUUID(),
        name: name || 'Untitled Socket',
        color
      });
    }
    
    handleCancel();
  };

  return (
    <div className="socket-manager">
      <h4>Socket Types</h4>
      
      <form onSubmit={handleSubmit} className="socket-form">
        <div className="form-row">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="socket-color-input"
            title="Socket Color"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Socket Name"
            className="socket-name-input"
            required
          />
          <button type="submit" className="btn btn-primary btn-sm">
            {editingSocketId ? 'Update' : 'Add'}
          </button>
          {editingSocketId && (
            <button type="button" onClick={handleCancel} className="btn btn-secondary btn-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="socket-list">
        {socketsList.length === 0 ? (
          <p className="empty-text">No sockets defined. Add one to start connecting tiles.</p>
        ) : (
          socketsList.map(socket => (
            <div key={socket.id} className="socket-item">
              <div 
                className="socket-color-indicator" 
                style={{ backgroundColor: socket.color }}
              />
              <span className="socket-name">{socket.name}</span>
              <div className="socket-actions">
                <button 
                  onClick={() => handleEdit(socket)}
                  className="icon-btn edit-btn"
                  title="Edit"
                >
                  ✎
                </button>
                <button 
                  onClick={() => handleDelete(socket.id)}
                  className="icon-btn delete-btn"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SocketManager;
