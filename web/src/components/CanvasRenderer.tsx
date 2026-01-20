import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { Tile } from '../types';

/**
 * Parse variant ID to extract base tile ID and transformation
 * Returns { baseId, rotation, reflectH, reflectV } or null if not a variant
 */
function parseVariantId(variantId: string): { baseId: string; rotation: number; reflectH: boolean; reflectV: boolean } | null {
  // Check if it's a variant (contains underscore and numbers)
  // Format: baseId_rotation[h][v] where h and v are optional flags
  const match = variantId.match(/^(.+?)_(\d+)(h)?(v)?$/);
  if (!match) {
    return null; // Not a variant, return as-is
  }

  const [, baseId, rotationStr, hFlag, vFlag] = match;
  return {
    baseId,
    rotation: parseInt(rotationStr, 10),
    reflectH: !!hFlag,
    reflectV: !!vFlag,
  };
}

const CanvasRenderer: React.FC = () => {
  const { generatedGrid, generationConfig, tiles } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<{ x: number, y: number, id: string } | null>(null);

  // Constants
  const BASE_TILE_SIZE = 32; // Base size in pixels
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 4.0;

  // Rendering Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !generatedGrid) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas (using logical coordinates since we scaled the context)
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    
    // Apply Transform
    // Center the map initially if no pan
    const mapPixelWidth = generatedGrid.width * BASE_TILE_SIZE * zoom;
    const mapPixelHeight = generatedGrid.height * BASE_TILE_SIZE * zoom;
    const centerX = (width - mapPixelWidth) / 2;
    const centerY = (height - mapPixelHeight) / 2;

    ctx.translate(centerX + pan.x, centerY + pan.y);
    ctx.scale(zoom, zoom);

    // Draw Grid
    const { width: gridW, height: gridH } = generatedGrid;
    
    // Optimize rendering loop - only draw visible tiles?
    // For now draw all as maps aren't huge (up to 500x500 might be slow though, but let's start simple)
    // Actually 500x500 is 250k draw calls, that IS slow.
    // Let's stick to simple loop first, if slow we optimize with viewport culling.

    // Cache sprites? They are base64 strings, Image objects need to be created.
    // Creating Images in render loop is bad.
    // We need a sprite cache.
    // For now, let's assume color rendering primarily or cached images.
    
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const index = y * gridW + x;
        const tileId = generatedGrid.grid[index];
        
        // Check if this is a variant ID
        const variantInfo = parseVariantId(tileId);
        const baseTileId = variantInfo ? variantInfo.baseId : tileId;
        const tile = tiles.get(baseTileId);

        if (tile) {
          const posX = x * BASE_TILE_SIZE;
          const posY = y * BASE_TILE_SIZE;

          ctx.save();
          
          // Apply transformation if this is a variant
          if (variantInfo) {
            // Move to center of tile
            ctx.translate(posX + BASE_TILE_SIZE / 2, posY + BASE_TILE_SIZE / 2);
            
            // Apply rotation
            if (variantInfo.rotation !== 0) {
              ctx.rotate((variantInfo.rotation * Math.PI) / 180);
            }
            
            // Apply reflections
            if (variantInfo.reflectH) {
              ctx.scale(-1, 1);
            }
            if (variantInfo.reflectV) {
              ctx.scale(1, -1);
            }
            
            // Move back to corner
            ctx.translate(-BASE_TILE_SIZE / 2, -BASE_TILE_SIZE / 2);
          }

          // Draw Tile
          if (tile.sprite) {
             // Fallback to color for now if image logic isn't ready
             if (tile.color) {
                ctx.fillStyle = tile.color;
                ctx.fillRect(variantInfo ? 0 : posX, variantInfo ? 0 : posY, BASE_TILE_SIZE, BASE_TILE_SIZE);
             }
             
             // Check if we have a cached image
             const img = SpriteCache.get(tile.id);
             if (img) {
                 ctx.drawImage(img, variantInfo ? 0 : posX, variantInfo ? 0 : posY, BASE_TILE_SIZE, BASE_TILE_SIZE);
             } else {
                 // Load it
                 SpriteCache.load(tile.id, tile.sprite, () => {
                     // Trigger re-render on load
                     requestAnimationFrame(render);
                 });
             }

          } else {
            ctx.fillStyle = tile.color || '#ff00ff'; // Magenta for error
            ctx.fillRect(variantInfo ? 0 : posX, variantInfo ? 0 : posY, BASE_TILE_SIZE, BASE_TILE_SIZE);
          }
          
          ctx.restore();
        }
      }
    }

    // Draw Grid Overlay
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1 / zoom; // Keep line width constant on screen
      ctx.beginPath();
      
      // Vertical lines
      for (let x = 0; x <= gridW; x++) {
        ctx.moveTo(x * BASE_TILE_SIZE, 0);
        ctx.lineTo(x * BASE_TILE_SIZE, gridH * BASE_TILE_SIZE);
      }
      
      // Horizontal lines
      for (let y = 0; y <= gridH; y++) {
        ctx.moveTo(0, y * BASE_TILE_SIZE);
        ctx.lineTo(gridW * BASE_TILE_SIZE, y * BASE_TILE_SIZE);
      }
      
      ctx.stroke();
    }

    // Highlight hovered tile
    if (hoveredTile) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(
            hoveredTile.x * BASE_TILE_SIZE, 
            hoveredTile.y * BASE_TILE_SIZE, 
            BASE_TILE_SIZE, 
            BASE_TILE_SIZE
        );
    }

    ctx.restore();

  }, [generatedGrid, tiles, zoom, pan, showGrid, hoveredTile]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Handle High-DPI
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
        
        // Reset scale for drawing context
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
        
        render();
      }
    };

    handleResize(); // Initial sizing

    // Use ResizeObserver to detect container size changes (e.g. sidebar toggle)
    let observer: ResizeObserver | null = null;
    if (containerRef.current) {
      observer = new ResizeObserver(() => handleResize());
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, [render]);

  // Trigger render when deps change
  useEffect(() => {
    requestAnimationFrame(render);
  }, [render]);

  // Event Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Calculate Hover
    if (canvasRef.current && containerRef.current && generatedGrid) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Inverse Transform
        const { width, height } = rect;
        const mapPixelWidth = generatedGrid.width * BASE_TILE_SIZE * zoom;
        const mapPixelHeight = generatedGrid.height * BASE_TILE_SIZE * zoom;
        const centerX = (width - mapPixelWidth) / 2;
        const centerY = (height - mapPixelHeight) / 2;
        
        const contentX = (mouseX - (centerX + pan.x)) / zoom;
        const contentY = (mouseY - (centerY + pan.y)) / zoom;
        
        const tileX = Math.floor(contentX / BASE_TILE_SIZE);
        const tileY = Math.floor(contentY / BASE_TILE_SIZE);
        
        if (tileX >= 0 && tileX < generatedGrid.width && tileY >= 0 && tileY < generatedGrid.height) {
            const index = tileY * generatedGrid.width + tileX;
            setHoveredTile({ x: tileX, y: tileY, id: generatedGrid.grid[index] });
        } else {
            setHoveredTile(null);
        }
    }

    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
  };

  if (!generatedGrid) {
    return (
        <div className="canvas-placeholder">
            <p>Ready to generate. Configure settings and click Generate.</p>
        </div>
    );
  }

  return (
    <div className="canvas-wrapper" ref={containerRef}>
      <div className="canvas-controls">
        <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.5))}>-</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.5))}>+</button>
        <button onClick={handleResetView}>Reset</button>
        <label>
            <input 
                type="checkbox" 
                checked={showGrid} 
                onChange={(e) => setShowGrid(e.target.checked)} 
            />
            Grid
        </label>
      </div>
      <div className="hover-info">
          {hoveredTile ? 
            `X: ${hoveredTile.x}, Y: ${hoveredTile.y} | ${tiles.get(hoveredTile.id)?.displayName || hoveredTile.id}` : 
            'Hover over map for details'
          }
      </div>
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />
    </div>
  );
};

// Simple Sprite Cache Helper
class SpriteCache {
    static cache = new Map<string, HTMLImageElement>();
    
    static get(id: string) {
        return this.cache.get(id);
    }
    
    static load(id: string, src: string, onLoad: () => void) {
        if (this.cache.has(id)) return;
        
        const img = new Image();
        img.onload = () => {
            this.cache.set(id, img);
            onLoad();
        };
        img.src = src;
    }
}

export default CanvasRenderer;
