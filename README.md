# WaveFunctionCollapse (Rust + JS/Wasm + Web App)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/badkangaroo/vibe-function-collapse.svg?style=social&label=Star)](https://github.com/badkangaroo/vibe-function-collapse)
[![Rust](https://img.shields.io/badge/rust-v1.75+-orange.svg)](https://www.rust-lang.org/)
[![Deploy Web App](https://github.com/badkangaroo/vibe-function-collapse/actions/workflows/deploy.yml/badge.svg)](https://github.com/badkangaroo/vibe-function-collapse/actions/workflows/deploy.yml)

**[🚀 Live Demo](https://badkangaroo.github.io/vibe-function-collapse/index.html)**

A high-performance Rust implementation of the Wave Function Collapse (WFC) algorithm, designed for generating tile-based maps and textures. This project includes:

- **Core Rust Library**: Fast and memory-efficient WFC implementation
- **WebAssembly Bindings**: JavaScript/TypeScript integration via `wasm-bindgen`
- **Interactive Web App**: Full-featured React-based frontend for visual tile rule creation, sprite management, and map generation

Perfect for web game developers who need to quickly prototype and generate procedurally consistent tilemaps with custom sprites and adjacency rules.

## How it Works

Wave Function Collapse is a constraint-based algorithm inspired by quantum mechanics. It generates procedurally consistent patterns from a set of rules.

1.  **Superposition**: Initially, every cell in the output grid exists in a state of "superposition," meaning it contains all possible tile states potentially allowed.
2.  **Entropy**: The algorithm calculates the "entropy" for each cell. Entropy is a measure of uncertainty; a cell with fewer possible valid states has lower entropy.
3.  **Collapse**: The algorithm selects the cell with the lowest entropy and "collapses" it to a single state (usually picked randomly based on weights).
4.  **Propagation**: Once a cell collapses, the change propagates to its neighbors. Because the neighbors must be compatible with the collapsed cell, their possibilities are reduced. This reduction might trigger further reductions in their neighbors, rippling through the grid.
5.  **Repeat**: Steps 2-4 are repeated until all cells are collapsed (success) or a contradiction is reached (failure, requiring a restart or backtrack).

## Features

### Core Library
-   **High Performance**: Rust-based implementation optimized for speed and memory efficiency.
-   **Wasm Bindings**: First-class support for JavaScript/TypeScript via `wasm-bindgen`.
-   **Weighted Rules**: Support for adjacency constraints with probability weights for fine-tuned generation.
-   **Deterministic Generation**: Seed-based random number generation for reproducible results.
-   **Backtracking**: (Optional) retry logic for handling failed generation attempts.

### Web Application Frontend
-   **Visual Tile Editor**: Intuitive interface for creating and managing tiles with sprite uploads or color fallbacks.
-   **Sprite Management**: Upload individual tiles or sprite sheets, with automatic tile extraction.
-   **Socket-Based Rule System**: Visual constraint editor using socket matching (assign socket IDs to tile edges).
-   **Manual Rule Builder**: Alternative adjacency matrix editor for fine-grained control.
-   **Live Preview**: Real-time visualization of generated maps with zoom, pan, and grid overlay.
-   **Project Persistence**: Save and load projects with tiles, rules, and settings.
-   **Export Options**: Download maps as images, export tile data as JSON, or generate tileset sprite sheets.
-   **Generation Controls**: Configure map dimensions, seeds, and retry behavior with instant visual feedback.

## Interface

### Terminology

-   **`Tile`**: A distinct state or image fragment.
-   **`Adjacency`**: Rules defining which tiles can be placed next to each other (Up, Down, Left, Right).
-   **`Model`**: The core state machine handling the grid and propagation.

### constraints.json Example

Rules are often defined in JSON:
```json
[
  { "id": "grass", "weight": 10 },
  { "id": "sand", "weight": 2 },
  { "id": "water", "weight": 1 },
  {
    "left": "grass", "right": "sand"
  },
  {
    "left": "sand", "right": "water"
  }
]
```

## Usage

### Rust

Add to `Cargo.toml`:
```toml
[dependencies]
wfc_rust = "0.1.0"
```

```rust
use wfc_rust::{Model, RuleSet};

fn main() {
    let mut rules = RuleSet::new();
    rules.add_adjacency("grass", "sand", Direction::Right);
    // ... add more rules

    let width = 20;
    let height = 20;
    let mut model = Model::new(width, height, rules);

    match model.run() {
        Ok(grid) => println!("Generated grid: {:?}", grid),
        Err(e) => eprintln!("Failed to generate: {:?}", e),
    }
}
```

### JavaScript / TypeScript

Install via npm (after building pkg):
```bash
npm install ./pkg
```

```javascript
import init, { WfcModel } from 'wfc_rust';

async function generateMap() {
    await init(); // Initialize Wasm

    // Define rules as a simple JS object or JSON
    const rules = [
        { id: "grass", edges: ["grass", "grass", "grass", "grass"] },
        { id: "road_h", edges: ["road", "grass", "road", "grass"] }, // matching socket IDs
        // ...
    ];

    const width = 50;
    const height = 50;

    // Create the model
    const model = new WfcModel(width, height);

    // Load rules
    model.load_rules(rules);

    // Run the collapse
    const success = model.run();

    if (success) {
        // specific generic buffer interface
        const result = model.get_grid();
        console.log("Map generated:", result);
        renderMap(result);
    } else {
        console.error("Contradiction reached.");
    }
}
```

## Project Structure

```
wavefunctioncollapse/
├── core/              # Core Rust library
│   ├── src/           # Rust source code
│   └── Cargo.toml     # Rust dependencies
├── core/pkg/          # Generated Wasm package (from wasm-pack)
├── web/               # React frontend application
│   ├── src/
│   │   ├── components/  # React components (TileManager, RuleEditor, CanvasRenderer)
│   │   ├── store/       # State management
│   │   └── utils/       # Wasm integration helpers
│   └── package.json
└── README.md
```

## Building

### Rust Library
```bash
cd core
cargo build --release
```

### WebAssembly Package
```bash
cd core
wasm-pack build --target web
```

This generates the `pkg/` directory containing the Wasm module and JavaScript bindings.

### Web Application
```bash
cd web
npm install
npm run dev      # Development server
npm run build    # Production build
```

The web app expects the Wasm package to be available via a file link in `package.json` pointing to `core/pkg`.

## Web App Usage

1. **Create Tiles**: Use the Tile Manager to add tiles with sprites (upload images) or colors.
2. **Define Rules**: Use the Socket Editor to assign socket IDs to tile edges, or manually define adjacency rules.
3. **Configure Generation**: Set map dimensions (width/height) and optionally set a seed for deterministic results.
4. **Generate Map**: Click "Generate" to run the WFC algorithm and visualize the result on the canvas.
5. **Export**: Download the generated map as an image, export tile data as JSON, or save your project for later.

### Example Workflow

1. Upload sprites for "grass", "water", and "road_horizontal" tiles.
2. Assign sockets: Grass edges = "land", Water edges = "water", Road horizontal edges = ["land", "road", "land", "road"].
3. Set weights: Grass = 10, Water = 3, Road = 1.
4. Generate a 64x64 map with seed "my-game-2024".
5. Export as PNG for use in your game engine.

## References & Inspiration

This project is a high-performance port and adaptation of the **Wave Function Collapse (WFC)** algorithm, originally created by **Maxim Gumin (mxgmn)**.

-   **Original Repository**: [https://github.com/mxgmn/WaveFunctionCollapse](https://github.com/mxgmn/WaveFunctionCollapse)
-   **Concepts Implemented**:
    -   **Simple Tiled Model**: This implementation focuses on the "Simple Tiled Model," where you explicitly define tiles and their adjacency rules (neighbors).
    -   **Constraint Propagation**: We use a constraint propagation model to ensure that all placed tiles satisfy the defined rules.
    -   **Entropy Heuristic**: Selection of the next cell to collapse is based on the lowest Shannon entropy.

The original WFC repository also includes an **Overlapping Model** (which generates patterns from an input image) and extensive symmetry handling, which are interesting concepts for future exploration.

## Contributing

See `PLAN.md` for detailed implementation roadmap and feature specifications.
