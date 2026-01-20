import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { WasmBridge } from '../utils/wasmBridge';
import { GenerationStats } from '../types';

const GenerationPanel: React.FC = () => {
  const {
    tiles,
    generationConfig,
    setGenerationConfig,
    setGeneratedGrid,
    addNotification
  } = useAppStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<GenerationStats | null>(null);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    // Requirements 6.1: Accept values between 1 and 500
    const clamped = Math.max(1, Math.min(500, val));
    setGenerationConfig({ width: clamped });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    // Requirements 6.1: Accept values between 1 and 500
    const clamped = Math.max(1, Math.min(500, val));
    setGenerationConfig({ height: clamped });
  };

  const handlePresetClick = (size: number) => {
    setGenerationConfig({ width: size, height: size });
  };

  const handleRandomizeSeed = () => {
    // Requirements 6.3: Randomize seed
    const randomSeed = Math.random().toString(36).substring(2, 10);
    setGenerationConfig({ seed: randomSeed });
  };

  const handleGenerate = async () => {
    if (tiles.size === 0) {
      addNotification('Add some tiles first!', 'warning');
      return;
    }

    setIsGenerating(true);
    setStats(null);
    setGeneratedGrid(null);

    const MAX_RETRIES = 5;
    let attempt = 0;
    let success = false;
    let currentConfig = { ...generationConfig };

    while (attempt <= MAX_RETRIES && !success) {
      // Give UI a moment to update and allow cancellation if we add it later
      await new Promise(r => setTimeout(r, 100));

      const startTime = performance.now();

      try {
        const grid = await WasmBridge.generate(tiles, currentConfig);

        const endTime = performance.now();
        const timeTaken = Math.round(endTime - startTime);

        setGeneratedGrid({
          grid,
          width: currentConfig.width,
          height: currentConfig.height
        });

        // Calculate basic stats
        const uniqueTiles = new Set(grid);
        setStats({
          timeTaken,
          iterations: 0, // Wasm doesn't expose this yet
          tilesUsed: uniqueTiles
        });

        addNotification(`Generated successfully${attempt > 0 ? ` after ${attempt} retries` : ''}!`, 'success');
        success = true;

      } catch (error: any) {
        console.error(`Generation attempt ${attempt} failed:`, error);

        if (generationConfig.retryOnFailure && attempt < MAX_RETRIES) {
          attempt++;
          addNotification(`Generation failed, retrying with new seed (${attempt}/${MAX_RETRIES})...`, 'info');

          // Randomize for next attempt
          const randomSeed = Math.random().toString(36).substring(2, 10);
          currentConfig = { ...currentConfig, seed: randomSeed };
          setGenerationConfig({ seed: randomSeed }); // Sync UI

          continue;
        }

        const msg = error.message || 'Unknown error';
        if (msg.includes('Contradiction')) {
          addNotification('Generation failed: Contradiction reached. Try adjusting rules or seed.', 'error');
        } else {
          addNotification(`Error: ${msg}`, 'error');
        }
        break; // Exit loop on final failure
      }
    }

    setIsGenerating(false);
  };

  return (
    <div className="generation-panel">
      <div className="control-group">
        <label>Grid Size</label>
        <div className="dimension-inputs">
          <div className="input-wrapper">
            <span>W:</span>
            <input
              type="number"
              value={generationConfig.width}
              onChange={handleWidthChange}
              min="1" max="500"
            />
          </div>
          <div className="input-wrapper">
            <span>H:</span>
            <input
              type="number"
              value={generationConfig.height}
              onChange={handleHeightChange}
              min="1" max="500"
            />
          </div>
        </div>

        <div className="presets">
          <button onClick={() => handlePresetClick(16)} className="preset-btn">16</button>
          <button onClick={() => handlePresetClick(32)} className="preset-btn">32</button>
          <button onClick={() => handlePresetClick(64)} className="preset-btn">64</button>
          <button onClick={() => handlePresetClick(128)} className="preset-btn">128</button>
        </div>
      </div>

      <div className="control-group">
        <label>Seed</label>
        <div className="seed-input-group">
          <input
            type="text"
            value={generationConfig.seed || ''}
            onChange={(e) => setGenerationConfig({ seed: e.target.value })}
            placeholder="Random"
          />
          <button onClick={handleRandomizeSeed} title="Randomize Seed" className="icon-btn">
            🎲
          </button>
        </div>
      </div>

      <div className="control-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={generationConfig.retryOnFailure}
            onChange={(e) => setGenerationConfig({ retryOnFailure: e.target.checked })}
          />
          Retry on failure
        </label>
      </div>

      <button
        className="btn btn-primary generate-btn"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating...' : 'Generate Map'}
      </button>

      {stats && (
        <div className="generation-stats">
          <div className="stat-row">
            <span>Time:</span>
            <strong>{stats.timeTaken}ms</strong>
          </div>
          <div className="stat-row">
            <span>Unique Tiles:</span>
            <strong>{stats.tilesUsed.size}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerationPanel;
