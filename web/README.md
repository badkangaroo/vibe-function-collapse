# WFC Web Application

A React-based visual interface for the Wave Function Collapse (WFC) algorithm, powered by a Rust/WebAssembly core.

## Features

- **Tile Management**: Create, edit, and delete tiles with sprites or colors.
- **Advanced Rule Editor**: Define adjacency rules using a flexible socket-based system.
  - **Multi-Socket Support**: Assign multiple compatible sockets to a single tile edge.
  - **Weighted Connections**: Define "soft rules" by assigning weights to connections, influencing the probability of neighbors.
- **Project Management**: Save and load your projects locally.
- **Wasm Integration**: High-performance map generation using the Rust core library.
- **Visualization**: Interactive Canvas-based rendering of generated maps with zoom and pan controls.
- **Export**: Export generated maps as images or JSON data.

## Project Structure

- `src/components/`: UI components (TileManager, RuleEditor, GenerationPanel, etc.)
- `src/store/`: State management using Zustand
- `src/utils/`: Utilities including the WasmBridge and storage helpers
- `src/types/`: TypeScript definitions
- `tests/`: Unit and property-based tests

## Usage Guide

### Defining Rules with Sockets
The application uses a "socket" system to define which tiles can be placed next to each other.

1.  **Create Sockets**: Go to the **Rule Editor > Sockets** tab. Create abstract connection types (e.g., "Grass", "Road", "Wall") and assign them colors.
2.  **Assign Sockets**: Switch to the **Assignments** tab.
    *   For each tile edge (Top, Right, Bottom, Left), you can add one or more sockets.
    *   **Multi-Socket Compatibility**: If a tile edge has multiple sockets (e.g., `[Grass, Dirt]`), it will match with any neighbor that shares at least one common socket on its opposing edge.
    *   **Weights**: You can assign a weight to each socket connection. Higher weights make that connection more likely to appear during generation (if supported by the solver configuration).

### Generating Maps
1.  Configure the grid size in the **Generation Panel**.
2.  (Optional) Set a random seed for reproducibility.
3.  Click **Generate** to run the WFC algorithm.

## Getting Started

1. **Build the Core Library**:
   Ensure the Wasm module is built first (requires `wasm-pack`).
   ```bash
   cd ../core
   wasm-pack build --target web
   ```

2. **Install Dependencies**:
   ```bash
   cd ../web
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Run Tests**:
   ```bash
   npm test
   ```

## Development Status

- ✅ Core Algorithm (Rust)
- ✅ Wasm Bindings
- ✅ Tile Management UI
- ✅ Rule Editor UI (Multi-Socket Assignments)
- ✅ Canvas Renderer & Interaction
- ✅ Generation Controls
- ✅ Project Persistence (Save/Load)
