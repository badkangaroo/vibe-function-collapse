# Web App Implementation Plan

## Goal
Create a comprehensive web-based interface for the Wave Function Collapse (WFC) Rust library. This app will allow users to interactively define tile sprites, configure adjacency rules, manage tile weights, and visualize the generated tilemaps with export capabilities for web game development.

## Architecture

*   **Frontend**: React (via Vite) with TypeScript for type safety and state management.
*   **State Management**: React Context API or Zustand for managing tiles, rules, and generation settings.
*   **Wasm Interface**: `wfc_rust` (compiled via `wasm-pack`).
*   **Rendering**: HTML5 Canvas API (for high-performance grid rendering with zoom/pan support).
*   **File Management**: FileReader API for sprite uploads, IndexedDB or localStorage for saving projects.

## Core Features

### 1. Sprite & Tile Management System
A comprehensive tile editor for creating and managing game tiles.

*   **Tile Library Panel**:
    *   Visual tile palette/gallery showing all defined tiles.
    *   Grid or list view with thumbnail previews.
    *   Search/filter functionality to find tiles by name or tags.
    *   Drag-and-drop reordering of tiles.
    *   Tile categories/tags (e.g., "terrain", "decorations", "buildings").

*   **Tile Creation & Editing**:
    *   **Add Tile Button**: Opens tile creation modal/form.
    *   **Tile Properties**:
        *   **Unique ID/Name**: Text input with validation (alphanumeric + underscores).
        *   **Display Name**: User-friendly name for the UI.
        *   **Sprite Upload**:
            *   Drag-and-drop image upload area.
            *   Support for common formats (PNG, JPG, WebP).
            *   Image preview with dimensions display.
            *   Optional sprite sheet support (tile dimensions selector).
        *   **Color Fallback**: Color picker for tiles without sprites (useful for prototyping).
        *   **Tile Weight**: Numeric input or slider (1-100) for probability weighting.
        *   **Tile Size**: Configurable tile dimensions (default 32x32, 16x16, 64x64 presets).
    *   **Tile Preview**: Live preview of how tile looks with sprite/color.
    *   **Edit/Delete Actions**: Inline editing and deletion with confirmation.

*   **Sprite Sheet Support** (Advanced):
    *   Upload a single image containing multiple tiles.
    *   Grid selector to define tile dimensions within the sheet.
    *   Automatic tile extraction and individual tile management.

### 2. Constraint & Rule Editor
A powerful system for defining tile adjacency rules using sockets or manual adjacency.

*   **Rule Management Panel**:
    *   Visual representation of all defined rules.
    *   Rule list with tile pairs and allowed directions.
    *   Quick delete/edit actions.

*   **Socket System (Recommended)**:
    *   **Socket Assignment Interface**:
        *   Visual tile editor showing tile with 4 edges (Top, Right, Bottom, Left).
        *   Click on an edge to assign/change socket ID.
        *   Visual indicators (colors, labels) for socket types.
        *   Socket library showing all defined socket types with auto-completion.
    *   **Socket Management**:
        *   Create named socket types (e.g., "grass-edge", "road-edge", "water-edge").
        *   Socket color coding for visual clarity.
        *   Bulk socket assignment tools.
    *   **Compatibility Rules**:
        *   Automatic rule generation: Two tiles connect if touching edges have matching sockets.
        *   Visual validation: Highlight compatible tiles in the library.

*   **Manual Adjacency Editor (Alternative)**:
    *   **Adjacency Matrix View**:
        *   Grid showing all tile pairs.
        *   Checkboxes for each direction (N, E, S, W).
        *   Visual indicators for bidirectional rules.
    *   **Rule Builder Wizard**:
        *   Select Tile A → Select Tile B → Select allowed directions.
        *   Preview of what the rule means visually.
        *   Bulk rule creation for common patterns.

*   **Rule Validation**:
    *   Real-time validation warnings (e.g., "Tile X has no valid neighbors").
    *   Contradiction detection (tiles that can never be placed).
    *   Rule symmetry checks (if A → B is allowed, is B → A?).

### 3. Live Visualization & Canvas Renderer
High-performance rendering with interactive features.

*   **Canvas Display**:
    *   Full-screen or resizable canvas area.
    *   Render tiles using uploaded sprites or fallback colors.
    *   High-DPI support (devicePixelRatio handling).

*   **Interactive Features**:
    *   **Zoom Controls**: Mouse wheel or buttons to zoom in/out (0.5x to 4x).
    *   **Pan/Drag**: Click and drag to navigate large maps.
    *   **Grid Overlay Toggle**: Show/hide grid lines between tiles.
    *   **Coordinate Display**: Show tile coordinates on hover.
    *   **Tile Inspector**: Click on a tile to see its ID, properties, and neighbors.

*   **Visualization Modes**:
    *   **Final Result**: Show completed collapsed map.
    *   **Superposition Mode** (optional/advanced):
        *   Visualize uncollapsed cells showing all possible states (semi-transparent overlay).
        *   Heat map showing entropy levels (cells with fewer possibilities are more "certain").
        *   Animation of the collapse process (step-by-step visualization).

*   **Export Options**:
    *   **Image Export**: Download canvas as PNG/JPG.
    *   **JSON Export**: Export tile data + rules for use in game engines.
    *   **Tileset Export**: Generate sprite sheet from used tiles.
    *   **Copy to Clipboard**: Copy tile ID grid as text/CSV.

### 4. Generation Controls & Configuration
Comprehensive controls for map generation.

*   **Grid Settings Panel**:
    *   **Width/Height Inputs**: Number inputs with validation (min: 1, max: reasonable limit like 500).
    *   **Presets**: Quick buttons for common sizes (16x16, 32x32, 64x64, 128x128).
    *   **Aspect Ratio Lock**: Option to maintain aspect ratio when resizing.

*   **Generation Parameters**:
    *   **Seed Input**:
        *   Text/number input for deterministic generation.
        *   Display current seed value.
        *   Copy seed to clipboard button.
    *   **Randomize Seed Button**: Generate new random seed (shows seed value).
    *   **Max Iterations**: Limit number of collapse steps (default: unlimited).
    *   **Retry on Failure**: Checkbox to automatically retry with new seed on contradiction.

*   **Generation Actions**:
    *   **Generate Button**: Primary action to run WFC algorithm.
    *   **Stop/Reset Button**: Cancel generation or clear current result.
    *   **Generate Multiple**: Generate N variations (useful for testing).

*   **Generation Status & Feedback**:
    *   Loading spinner/indicator during generation.
    *   Progress indicator (if implementing step-by-step visualization).
    *   Success/error notifications:
        *   "Map generated successfully!"
        *   "Contradiction reached. Try a different seed or adjust rules."
        *   "Generation failed: [specific error]".
    *   Generation statistics: Time taken, iterations, tiles used.

### 5. Project Management & Persistence
Save and load projects for continued work.

*   **Project System**:
    *   **Save Project**: Save current tiles, rules, and settings to localStorage/IndexedDB.
    *   **Load Project**: Load previously saved projects.
    *   **Project Name**: Assign names to projects with metadata (created date, last modified).
    *   **Project Gallery**: List of saved projects with thumbnails.
    *   **Export/Import**: Download project as JSON file, upload to restore.

*   **Undo/Redo** (Optional but useful):
    *   Track changes to tiles and rules.
    *   Undo/redo buttons for major actions.

*   **Preset Templates**:
    *   Built-in example projects (e.g., "Basic Terrain", "City Map", "Dungeon").
    *   Quick-start templates for common game genres.

## Data Flow

1.  **User** configures Tiles (with sprites/colors) and Rules (socket-based or manual) in the React UI.
2.  **App** stores tile definitions in state (React Context/Zustand):
    *   Tile ID → Sprite URL/Color mapping
    *   Tile ID → Weight mapping
    *   Tile ID → Socket assignments (4 edges)
3.  **App** converts UI state into the JSON format expected by `wfc_rust`:
    *   Extracts adjacency rules from socket matching or manual adjacency
    *   Includes tile weights
4.  **App** initializes Wasm module: `await init()`.
5.  **App** creates model: `const model = new WfcModel(width, height, seed)`.
6.  **App** loads rules: `model.load_rules(jsonRules)`.
7.  **App** runs algorithm: `const success = model.run()`.
8.  **Rust** returns a flat `Uint32Array` or `Int32Array` representing tile IDs.
9.  **Canvas** iterates over the array and draws sprites/colors based on tile ID lookup.
10. **App** updates UI with result (success/error notifications, statistics).

## Implementation Steps

### Phase 1: Project Setup & Basic Infrastructure
- [ ] Initialize Vite + React + TypeScript project (`npm create vite@latest my-app -- --template react-ts`).
- [ ] Install dependencies: `zustand` (or React Context), `react-dropzone`, `file-saver`.
- [ ] Set up project structure:
    *   `/src/components/` (CanvasRenderer, TileManager, RuleEditor, etc.)
    *   `/src/store/` (state management)
    *   `/src/utils/` (Wasm helpers, export functions)
    *   `/src/types/` (TypeScript interfaces)
- [ ] Link local `pkg` (Wasm) folder or configure npm workspace.
- [ ] Create basic app layout with sidebar, main canvas area, and control panels.
- [ ] Set up TypeScript types for Tile, Rule, Project data structures.

### Phase 2: WASM Integration & Basic Canvas Rendering
- [ ] Create Wasm wrapper/hooks (`useWasm.ts` or `wasm.ts` utility).
- [ ] Implement Wasm initialization on app mount.
- [ ] Create `CanvasRenderer` component with HTML5 Canvas:
    *   Canvas element with ref
    *   Basic resize handling
    *   High-DPI support (devicePixelRatio)
- [ ] Create initial tile ID → color mapping (hardcoded for testing).
- [ ] Implement `renderGrid(grid: Uint32Array, width: number, height: number, tileSize: number)`.
- [ ] Create basic "Generate" button that calls `model.run()` and renders result.
- [ ] Test with mock/hardcoded rules to verify rendering pipeline.

### Phase 3: Tile Management System
- [ ] Create `TileManager` component with tile library view.
- [ ] Implement tile state management (Zustand store or Context):
    *   `tiles: Map<TileID, TileDefinition>`
    *   Actions: `addTile`, `updateTile`, `deleteTile`, `reorderTiles`
- [ ] Build `TileEditor` modal/form:
    *   ID input with validation
    *   Color picker component
    *   File upload with preview (using `react-dropzone` or FileReader API)
    *   Weight slider/input
    *   Save/Cancel buttons
- [ ] Implement sprite image loading and storage:
    *   Convert uploaded images to ImageData or URLs
    *   Store in IndexedDB or convert to base64 (for persistence)
- [ ] Update `CanvasRenderer` to use tile definitions from state (lookup sprites/colors by ID).
- [ ] Add tile deletion with confirmation dialog.
- [ ] Implement tile search/filter functionality.

### Phase 4: Rule Editor & Socket System
- [ ] Create `RuleEditor` component with tabbed interface (Socket System / Manual Adjacency).
- [ ] Implement Socket System UI:
    *   `SocketManager`: List of socket types with colors/labels
    *   `TileSocketEditor`: Visual tile editor with clickable edges
    *   Socket assignment UI (dropdown or visual picker for each edge)
- [ ] Implement rule generation from sockets:
    *   Function to compute adjacency rules: For each tile pair, check if edges match
    *   Generate rules JSON format expected by Rust
- [ ] Implement Manual Adjacency UI (alternative mode):
    *   Adjacency matrix grid component
    *   Rule builder wizard component
- [ ] Add rule validation logic:
    *   Check for tiles with no valid neighbors
    *   Warn about potential contradictions
- [ ] Integrate rules with generation: Update `model.load_rules()` call to use current state.

### Phase 5: Generation Controls & Configuration
- [ ] Create `GenerationPanel` component:
    *   Width/Height inputs with validation
    *   Preset size buttons
    *   Seed input field
    *   Randomize seed button (generate UUID or random number)
- [ ] Implement seed handling in Rust integration (update Wasm interface if needed).
- [ ] Add generation state management:
    *   Loading state during generation
    *   Success/error state
    *   Result statistics (time, iterations)
- [ ] Implement error handling:
    *   Try-catch around `model.run()`
    *   Display user-friendly error messages (toast notifications or inline)
    *   Retry logic option
- [ ] Add "Generate" button with loading spinner.

### Phase 6: Enhanced Canvas Features & Interaction
- [ ] Implement zoom functionality:
    *   Mouse wheel zoom handler
    *   Zoom buttons (+/-) with zoom level display
    *   Zoom limits (min/max)
- [ ] Implement pan/drag functionality:
    *   Mouse/touch drag handlers
    *   Viewport transform tracking
- [ ] Add grid overlay toggle (draw grid lines between tiles).
- [ ] Implement tile inspector on hover/click:
    *   Show tile ID, coordinates
    *   Highlight tile boundaries
- [ ] Add canvas export functionality:
    *   "Export as PNG" button using `canvas.toBlob()`
    *   Optional: "Export as JSON" (tile data + metadata)

### Phase 7: Project Persistence & Advanced Features
- [ ] Implement project save/load:
    *   Serialize tiles, rules, settings to JSON
    *   Save to localStorage or IndexedDB
    *   Project metadata (name, created, modified dates)
- [ ] Create `ProjectManager` component:
    *   List of saved projects
    *   Load/Delete project actions
    *   Project gallery with thumbnails
- [ ] Implement export/import:
    *   Download project as JSON file (`file-saver` library)
    *   Upload JSON to restore project
- [ ] Add preset templates:
    *   Create example projects (basic terrain, etc.)
    *   "New from Template" functionality

### Phase 8: Polish & Advanced Visualization (Optional)
- [ ] Implement superposition visualization mode:
    *   Show uncollapsed cells with semi-transparent overlays
    *   Heat map for entropy values (if Rust exposes this)
- [ ] Add step-by-step animation:
    *   Pause/resume generation
    *   Step forward/backward through collapse process
- [ ] Implement tileset export:
    *   Generate sprite sheet from used tiles
    *   Export with metadata (JSON mapping file)
- [ ] Add keyboard shortcuts:
    *   `Ctrl+S` to save project
    *   `Ctrl+R` to generate
    *   `Space` to play/pause animation (if implemented)
- [ ] Responsive design improvements:
    *   Mobile-friendly layouts
    *   Collapsible panels
    *   Touch gesture support

### Phase 9: Testing & Optimization
- [ ] Add unit tests for rule generation logic.
- [ ] Test with large grids (performance optimization if needed).
- [ ] Test sprite loading with various image formats/sizes.
- [ ] Optimize canvas rendering for large maps (view frustum culling if needed).
- [ ] Add error boundaries for React components.
- [ ] Test Wasm module loading and error handling.
