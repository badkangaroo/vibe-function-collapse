import { useState, useRef } from 'react';
import MainControls from './components/MainControls';
import NotificationToast from './components/NotificationToast';
import CanvasRenderer from './components/CanvasRenderer';
import ProjectGallery from './components/ProjectGallery';
import { useAppStore } from './store/appStore';
import { StorageUtil } from './utils/storage';
import { ProjectIO } from './utils/projectIO';
import { Project } from './types';
import './App.css';
import './components/CanvasRenderer.css';
import './components/ExportPanel.css';
import './components/ProjectGallery.css';

/**
 * Main application component with responsive layout
 */
function App() {
  const [projectName, setProjectName] = useState<string>('Untitled Project');
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);
  const [showProjectGallery, setShowProjectGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    tiles,
    sockets,
    generationConfig,
    addNotification,
    addTile,
    addSocket,
    setGenerationConfig
  } = useAppStore();

  const getCurrentProjectState = async (): Promise<Project> => {
    // Capture thumbnail from canvas if possible
    let thumbnail: string | undefined;
    const canvas = document.querySelector('canvas');
    if (canvas) {
      // Create small thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 200;
      thumbCanvas.height = 150; // Aspect ratio
      const ctx = thumbCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);
      }
    }

    return {
      version: '1.0.0',
      name: projectName,
      createdAt: new Date().toISOString(), // In real app, preserve original creation date
      modifiedAt: new Date().toISOString(),
      tiles: Array.from(tiles.values()),
      sockets: Array.from(sockets.values()),
      config: generationConfig,
      thumbnail
    };
  };

  // Save Project Handler
  const handleSaveProject = async () => {
    try {
      const project = await getCurrentProjectState();
      await StorageUtil.saveProject(project);
      addNotification(`Project "${projectName}" saved!`, 'success');
    } catch (error) {
      console.error(error);
      addNotification('Failed to save project', 'error');
    }
  };

  // Export Project Handler
  const handleExportProject = async () => {
    try {
      const project = await getCurrentProjectState();
      await ProjectIO.exportProject(project);
      addNotification(`Project exported to ZIP`, 'success');
    } catch (error) {
      console.error(error);
      addNotification('Failed to export project', 'error');
    }
  };

  // Import Project Handler
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const project = await ProjectIO.importProject(file);
      handleLoadProject(project);
      // Clear input
      event.target.value = '';
    } catch (error) {
      console.error(error);
      addNotification('Failed to import project', 'error');
    }
  };

  // Load Project Handler
  const handleLoadProject = (project: Project) => {
    // Migration for legacy socket strings (runtime check)
    const migratedTiles = project.tiles.map(tile => {
      const sockets: any = { ...tile.sockets };
      (['top', 'right', 'bottom', 'left'] as const).forEach(dir => {
        const val = sockets[dir];
        // Check if it's a string (old format)
        if (typeof val === 'string') {
          if (val === '0' || !val) {
            sockets[dir] = [];
          } else {
            sockets[dir] = [{ socketId: val, weight: 1 }];
          }
        }
      });
      return { ...tile, sockets };
    });

    // Load Tiles
    migratedTiles.forEach(tile => addTile(tile));

    // Load Sockets
    project.sockets.forEach(socket => addSocket(socket));

    // Load Config
    setGenerationConfig(project.config);

    setProjectName(project.name);
    setShowProjectGallery(false);
    addNotification(`Project "${project.name}" loaded`, 'success');
  };

  return (
    <div className="app-container">
      <NotificationToast />

      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".zip"
        style={{ display: 'none' }}
      />

      {/* Project Gallery Modal */}
      {showProjectGallery && (
        <div className="modal-overlay" onClick={() => setShowProjectGallery(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Open Project</h3>
              <button className="close-btn" onClick={() => setShowProjectGallery(false)}>×</button>
            </div>
            <ProjectGallery onLoadProject={handleLoadProject} />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Wave Function Collapse</h1>
          <div className="project-controls">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="project-name-input"
            />
            <button className="btn btn-sm btn-primary" onClick={handleSaveProject} title="Save to Browser Storage">Save</button>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowProjectGallery(true)} title="Open from Browser Storage">Open</button>
            <div className="separator" style={{ width: '1px', height: '20px', background: '#ccc', margin: '0 8px' }}></div>
            <button className="btn btn-sm btn-secondary" onClick={handleExportProject} title="Download Project as ZIP">Export</button>
            <button className="btn btn-sm btn-secondary" onClick={handleImportClick} title="Import Project from ZIP">Import</button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="app-main">
        {/* Center canvas area */}
        <main className="canvas-area">
          <div className="canvas-container">
            <CanvasRenderer />
          </div>
        </main>

        {/* Right sidebar - Rule Editor & Generation Panel */}
        <aside className={`sidebar sidebar-right ${rightPanelCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <button
              className="collapse-btn"
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              aria-label={rightPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {rightPanelCollapsed ? '←' : '→'}
            </button>
            <h2>Controls</h2>
          </div>
          {!rightPanelCollapsed && (
            <div className="sidebar-content">
              <MainControls />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;
