import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Tile, SymmetryType } from '../types';

interface TileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tile: Tile) => void;
  initialTile?: Tile | null;
  existingSprites?: string[];
}

const TileEditor: React.FC<TileEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTile,
  existingSprites = [],
}) => {
  const [displayName, setDisplayName] = useState('');
  const [weight, setWeight] = useState<number>(1);
  const [color, setColor] = useState('#cccccc');
  const [sprite, setSprite] = useState<string | undefined>(undefined);
  const [spritePreview, setSpritePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'color' | 'sprite'>('color');
  const [symmetry, setSymmetry] = useState<SymmetryType | undefined>(undefined);

  // Initialize form when tile changes
  useEffect(() => {
    if (initialTile) {
      setDisplayName(initialTile.displayName);
      setWeight(initialTile.weight);
      setColor(initialTile.color || '#cccccc');
      setSprite(initialTile.sprite);
      setSpritePreview(initialTile.sprite || null);
      setActiveTab(initialTile.sprite ? 'sprite' : 'color');
      setSymmetry(initialTile.symmetry);
    } else {
      resetForm();
    }
  }, [initialTile, isOpen]);

  const resetForm = () => {
    setDisplayName('');
    setWeight(1);
    setColor('#cccccc');
    setSprite(undefined);
    setSpritePreview(null);
    setActiveTab('color');
    setSymmetry(undefined);
  };

  // Handle file drop
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        
        // Create an image to get dimensions
        const img = new Image();
        img.onload = () => {
          // In a real app we might validate dimensions here
          // For now just set the sprite
          setSprite(result);
          setSpritePreview(result);
        };
        img.src = result;
      };

      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const tileId = initialTile?.id || crypto.randomUUID();
    
    // Default sockets if creating new
    const sockets = initialTile?.sockets || {
      top: [],
      right: [],
      bottom: [],
      left: [],
    };

    const newTile: Tile = {
      id: tileId,
      displayName: displayName || 'Untitled Tile',
      weight: Math.max(1, Math.min(100, weight)),
      color: activeTab === 'color' ? color : undefined,
      sprite: activeTab === 'sprite' ? sprite : undefined,
      sockets,
      symmetry,
    };

    onSave(newTile);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{initialTile ? 'Edit Tile' : 'New Tile'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="tile-form">
          <div className="form-group">
            <label htmlFor="displayName">Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Grass"
              className="form-input"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="weight">Weight (1-100)</label>
            <input
              id="weight"
              type="number"
              min="1"
              max="100"
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value) || 1)}
              className="form-input"
            />
            <small className="form-help">Higher weight = more frequent</small>
          </div>

          <div className="form-group">
            <label htmlFor="symmetry">Symmetry (Optional)</label>
            <select
              id="symmetry"
              value={symmetry || ''}
              onChange={(e) => setSymmetry(e.target.value ? (e.target.value as SymmetryType) : undefined)}
              className="form-input"
            >
              <option value="">None (Manual rotation)</option>
              <option value="X">X - Full symmetry (1 variant)</option>
              <option value="I">I - Horizontal/vertical reflection (2 variants)</option>
              <option value="T">T - T-shaped (4 rotations)</option>
              <option value="L">L - L-shaped (4 rotations)</option>
              <option value="\\">\ - Diagonal reflection (2 variants)</option>
              <option value="F">F - F-shaped (8 variants)</option>
              <option value="N">N - No symmetry (8 variants)</option>
            </select>
            <small className="form-help">
              Automatically generates rotated/reflected variants. Higher variants = more tile diversity.
            </small>
          </div>

          <div className="form-group">
            <label>Visual Representation</label>
            
            <div className="visual-tabs">
              <div 
                className={`visual-tab ${activeTab === 'color' ? 'active' : ''}`}
                onClick={() => setActiveTab('color')}
              >
                Color
              </div>
              <div 
                className={`visual-tab ${activeTab === 'sprite' ? 'active' : ''}`}
                onClick={() => setActiveTab('sprite')}
              >
                Sprite
              </div>
            </div>

            {activeTab === 'color' ? (
              <div className="color-picker-container">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="color-input"
                />
                <span className="color-value">{color}</span>
              </div>
            ) : (
              <div className="sprite-uploader-container">
                <div className="sprite-uploader">
                  <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                    <input {...getInputProps()} />
                    {spritePreview ? (
                      <div className="sprite-preview-container">
                        <img src={spritePreview} alt="Preview" className="sprite-preview" />
                        <p className="change-text">Click or drag to replace</p>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <p>Drag & drop image here</p>
                        <small>PNG, JPG, WEBP</small>
                      </div>
                    )}
                  </div>
                  {sprite && (
                    <button 
                      type="button" 
                      className="remove-sprite-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSprite(undefined);
                        setSpritePreview(null);
                      }}
                    >
                      Remove Sprite
                    </button>
                  )}
                </div>

                {existingSprites.length > 0 && (
                  <div className="existing-sprites-section">
                    <h4>Or select from existing assets:</h4>
                    <div className="existing-assets-gallery">
                      {existingSprites.map((s, i) => (
                        <div 
                          key={i} 
                          className={`asset-item ${sprite === s ? 'selected' : ''}`}
                          onClick={() => {
                            setSprite(s);
                            setSpritePreview(s);
                          }}
                        >
                          <img src={s} alt={`Asset ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Tile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TileEditor;