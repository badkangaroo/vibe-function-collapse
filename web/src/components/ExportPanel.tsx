import React from 'react';
import { useAppStore } from '../store/appStore';
import { saveAs } from 'file-saver';

const ExportPanel: React.FC = () => {
  const { 
    generatedGrid, 
    generationConfig, 
    tiles, 
    addNotification 
  } = useAppStore();

  const handleExportPNG = async () => {
    if (!generatedGrid) return;

    try {
      // Create a temporary canvas at full resolution
      const tileSize = 32; // Fixed export size or configurable? 32 is standard
      const width = generatedGrid.width * tileSize;
      const height = generatedGrid.height * tileSize;
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not create canvas context');

      // Helper to load image
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      // Draw all tiles
      // This might take a moment for large maps with many sprites
      // We process sequentially or in batches to avoid freezing UI?
      // For MVP, just do it.
      
      for (let y = 0; y < generatedGrid.height; y++) {
        for (let x = 0; x < generatedGrid.width; x++) {
          const index = y * generatedGrid.width + x;
          const tileId = generatedGrid.grid[index];
          const tile = tiles.get(tileId);
          
          if (tile) {
            const posX = x * tileSize;
            const posY = y * tileSize;
            
            if (tile.sprite) {
              const img = await loadImage(tile.sprite);
              ctx.drawImage(img, posX, posY, tileSize, tileSize);
            } else {
              ctx.fillStyle = tile.color || '#ff00ff';
              ctx.fillRect(posX, posY, tileSize, tileSize);
            }
          }
        }
      }

      // Convert to blob and save
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `wfc-map-${Date.now()}.png`);
          addNotification('Map exported as PNG', 'success');
        }
      });

    } catch (error) {
      console.error(error);
      addNotification('Failed to export PNG', 'error');
    }
  };

  const handleExportJSON = () => {
    if (!generatedGrid) return;

    try {
      const exportData = {
        config: generationConfig,
        grid: Array.from(generatedGrid.grid), // Convert TypedArray/Vector to plain array
        timestamp: new Date().toISOString(),
        // Include tile mapping?
        // Ideally yes, otherwise IDs are meaningless without the project file.
        // Requirement 10.2: "contain all tile IDs and metadata"
        tiles: Array.from(tiles.values()).map(t => ({
            id: t.id,
            name: t.displayName
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      saveAs(blob, `wfc-map-${Date.now()}.json`);
      addNotification('Map exported as JSON', 'success');
    } catch (error) {
      console.error(error);
      addNotification('Failed to export JSON', 'error');
    }
  };

  const handleCopyToClipboard = async () => {
    if (!generatedGrid) return;

    try {
      // Format as CSV-like text grid of Tile Names (or IDs?)
      // Names are more readable.
      const rows: string[] = [];
      for (let y = 0; y < generatedGrid.height; y++) {
        const row: string[] = [];
        for (let x = 0; x < generatedGrid.width; x++) {
          const index = y * generatedGrid.width + x;
          const tileId = generatedGrid.grid[index];
          const tile = tiles.get(tileId);
          row.push(tile?.displayName || tileId);
        }
        rows.push(row.join(', '));
      }
      
      const textData = rows.join('\n');
      await navigator.clipboard.writeText(textData);
      addNotification('Map data copied to clipboard', 'success');
    } catch (error) {
      console.error(error);
      addNotification('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="export-panel">
      <div className="export-controls">
        <button 
          className="btn btn-secondary export-btn" 
          onClick={handleExportPNG}
          disabled={!generatedGrid}
        >
          Export PNG
        </button>
        <button 
          className="btn btn-secondary export-btn" 
          onClick={handleExportJSON}
          disabled={!generatedGrid}
        >
          Export JSON
        </button>
        <button 
          className="btn btn-secondary export-btn" 
          onClick={handleCopyToClipboard}
          disabled={!generatedGrid}
        >
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
};

export default ExportPanel;
