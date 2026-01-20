# Design Document: Wave Function Collapse Web Application

## Overview

This design describes a comprehensive web-based system for the Wave Function Collapse (WFC) algorithm, consisting of two main components:

1. **Core Library** (`core/`): A high-performance Rust implementation of the WFC algorithm with WebAssembly bindings
2. **Web Application** (`web/`): A React-based visual interface for tile management, rule definition, and map visualization

The system enables game developers to create procedurally generated tile-based maps through an intuitive visual interface while leveraging Rust's performance for the core algorithm.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                     Web Application                      │
│                        (web/)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Tile Manager │  │ Rule Editor  │  │   Canvas     │  │
│  │  Component   │  │  Component   │  │  Renderer    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                │                 │           │
│           └────────────────┴─────────────────┘           │
│                          │                               │
│                  ┌───────▼────────┐                      │
│                  │  State Manager │                      │
│                  │   (Zustand)    │                      │
│                  └───────┬────────┘                      │
│                          │                               │
│                  ┌───────▼────────┐                      │
│                  │  Wasm Bridge   │                      │
│                  └───────┬────────┘                      │
└──────────────────────────┼──────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Wasm Module │
                    │  (core/pkg) │
                    └──────┬──────┘
                           │
┌──────────────────────────┼──────────────────────────────┐
│                   Core Library                           │
│                     (core/)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │     Model    │  │   RuleSet    │  │   Random     │  │
│  │  (WFC Logic) │  │ (Constraints)│  │  Generator   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

**Core Library:**
- Language: Rust (2021 edition)
- Wasm Bindings: wasm-bindgen
- Build Tool: wasm-pack
- Serialization: serde, serde_json

**Web Application:**
- Framework: React 18 with TypeScript
- Build Tool: Vite
- State Management: Zustand
- Canvas Rendering: HTML5 Canvas API
- File Handling: FileReader API
- Storage: IndexedDB (via idb library)

## Components and Interfaces

### Core Library Components

#### 1. Model (WFC Algorithm)

The Model implements the Wave Function Collapse algorithm with the following structure:

```rust
pub struct Model {
    width: usize,
    height: usize,
    grid: Vec<Cell>,
    rules: RuleSet,
    rng: StdRng,
}

pub struct Cell {
    collapsed: bool,
    possibilities: HashSet<TileId>,
}

impl Model {
    pub fn new(width: usize, height: usize, rules: RuleSet, seed: Option<u64>) -> Result<Self>;
    pub fn run(&mut self) -> Result<Vec<TileId>>;
    fn find_lowest_entropy(&self) -> Option<usize>;
    fn collapse_cell(&mut self, index: usize) -> Result<()>;
    fn propagate(&mut self, index: usize) -> Result<()>;
    fn get_neighbors(&self, index: usize) -> Vec<(usize, Direction)>;
}
```

**Algorithm Flow:**
1. Initialize all cells in superposition (all tiles possible)
2. Loop until all cells collapsed or contradiction:
   - Find cell with lowest entropy (fewest possibilities)
   - Collapse cell to single tile (weighted random selection)
   - Propagate constraints to neighbors
   - Recursively propagate until no more changes
3. Return grid or error

#### 2. RuleSet (Constraint Management)

```rust
pub struct RuleSet {
    tiles: HashMap<TileId, TileInfo>,
    adjacency: HashMap<(TileId, Direction), HashSet<TileId>>,
}

pub struct TileInfo {
    id: TileId,
    weight: u32,
}

pub enum Direction {
    Up,
    Down,
    Left,
    Right,
}

impl RuleSet {
    pub fn new() -> Self;
    pub fn add_tile(&mut self, id: TileId, weight: u32);
    pub fn add_adjacency(&mut self, from: TileId, to: TileId, direction: Direction);
    pub fn get_valid_neighbors(&self, tile: TileId, direction: Direction) -> &HashSet<TileId>;
    pub fn from_json(json: &str) -> Result<Self>;
}
```

**JSON Format:**
```json
{
  "tiles": [
    { "id": "grass", "weight": 10 },
    { "id": "water", "weight": 3 }
  ],
  "rules": [
    { "from": "grass", "to": "grass", "direction": "Up" },
    { "from": "grass", "to": "water", "direction": "Right" }
  ]
}
```

#### 3. Wasm Bindings

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WfcModel {
    model: Option<Model>,
    rules: Option<RuleSet>,
    width: usize,
    height: usize,
}

#[wasm_bindgen]
impl WfcModel {
    #[wasm_bindgen(constructor)]
    pub fn new(width: usize, height: usize, seed: Option<u64>) -> Result<WfcModel, JsValue>;
    
    #[wasm_bindgen]
    pub fn load_rules(&mut self, json: &str) -> Result<(), JsValue>;
    
    #[wasm_bindgen]
    pub fn run(&mut self) -> Result<bool, JsValue>;
    
    #[wasm_bindgen]
    pub fn get_grid(&self) -> Result<Vec<u32>, JsValue>;
}
```

### Web Application Components

#### 1. State Management (Zustand Store)

```typescript
interface Tile {
  id: string;
  displayName: string;
  sprite?: string; // base64 or URL
  color?: string;
  weight: number;
  sockets: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

interface Socket {
  id: string;
  name: string;
  color: string;
}

interface GenerationConfig {
  width: number;
  height: number;
  seed?: string;
  retryOnFailure: boolean;
}

interface AppState {
  tiles: Map<string, Tile>;
  sockets: Map<string, Socket>;
  generationConfig: GenerationConfig;
  generatedGrid: { grid: string[]; width: number; height: number } | null;
  
  // Actions
  addTile: (tile: Tile) => void;
  updateTile: (id: string, updates: Partial<Tile>) => void;
  deleteTile: (id: string) => void;
  addSocket: (socket: Socket) => void;
  setGenerationConfig: (config: Partial<GenerationConfig>) => void;
  setGeneratedGrid: (grid: { grid: string[]; width: number; height: number } | null) => void;
}
```

#### 2. Tile Manager Component

```typescript
interface TileManagerProps {
  tiles: Map<string, Tile>;
  onAddTile: (tile: Tile) => void;
  onEditTile: (id: string, updates: Partial<Tile>) => void;
  onDeleteTile: (id: string) => void;
}

const TileManager: React.FC<TileManagerProps> = ({ ... }) => {
  // Renders tile gallery
  // Handles tile CRUD operations
  // Manages sprite uploads
  // Provides search/filter functionality
};
```

**Sprite Upload Flow:**
1. User drops/selects image file
2. FileReader reads file as DataURL
3. Image loaded and validated
4. Base64 stored in tile definition
5. Preview rendered in gallery

#### 3. Rule Editor Component

```typescript
interface RuleEditorProps {
  tiles: Map<string, Tile>;
  sockets: Map<string, Socket>;
  onUpdateTileSockets: (tileId: string, sockets: Tile['sockets']) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ ... }) => {
  // Socket assignment interface
  // Visual tile edge editor
  // Rule validation display
};
```

**Socket-Based Rule Generation:**
```typescript
function generateRulesFromSockets(tiles: Map<string, Tile>): Rule[] {
  const rules: Rule[] = [];
  
  for (const [id1, tile1] of tiles) {
    for (const [id2, tile2] of tiles) {
      // Check if tiles can connect in each direction
      if (tile1.sockets.right === tile2.sockets.left) {
        rules.push({ from: id1, to: id2, direction: 'Right' });
      }
      if (tile1.sockets.bottom === tile2.sockets.top) {
        rules.push({ from: id1, to: id2, direction: 'Down' });
      }
      // ... other directions
    }
  }
  
  return rules;
}
```

#### 4. Canvas Renderer Component

```typescript
interface CanvasRendererProps {
  grid: Uint32Array | null;
  tiles: Map<string, Tile>;
  width: number;
  height: number;
  tileSize: number;
}

const CanvasRenderer: React.FC<CanvasRendererProps> = ({ ... }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    renderGrid();
  }, [grid, zoom, pan]);
  
  const renderGrid = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Apply zoom and pan transforms
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);
    
    // Render each tile
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileId = grid[y * width + x];
        const tile = tiles.get(tileId);
        renderTile(ctx, tile, x * tileSize, y * tileSize);
      }
    }
    
    ctx.restore();
  };
};
```

**Rendering Optimizations:**
- High-DPI support: `canvas.width = width * devicePixelRatio`
- View frustum culling for large grids
- Sprite caching using off-screen canvas
- Debounced re-renders on zoom/pan

#### 5. Wasm Bridge

```typescript
class WasmBridge {
  private module: typeof import('core/pkg') | null = null;
  
  async initialize(): Promise<void> {
    this.module = await import('core/pkg');
  }
  
  async generate(
    tiles: Map<string, Tile>,
    config: GenerationConfig
  ): Promise<Uint32Array> {
    if (!this.module) throw new Error('Wasm not initialized');
    
    // Convert tiles and sockets to rules JSON
    const rules = this.convertToRulesJson(tiles);
    
    // Create model
    const model = new this.module.WfcModel(
      config.width,
      config.height,
      config.seed ? BigInt(config.seed) : undefined
    );
    
    // Load rules
    model.load_rules(JSON.stringify(rules));
    
    // Run algorithm
    const success = model.run();
    
    if (!success) {
      throw new Error('Generation failed: contradiction reached');
    }
    
    // Get result
    return model.get_grid();
  }
  
  private convertToRulesJson(tiles: Map<string, Tile>) {
    // Generate rules from socket assignments
    const rules = generateRulesFromSockets(tiles);
    
    return {
      tiles: Array.from(tiles.values()).map(t => ({
        id: t.id,
        weight: t.weight
      })),
      rules: rules.map(r => ({
        from: r.from,
        to: r.to,
        direction: r.direction
      }))
    };
  }
}
```

## Data Models

### Core Library Data Structures

**Grid Representation:**
- Flat array: `Vec<Cell>` where index = `y * width + x`
- Each cell tracks collapsed state and possible tiles
- Efficient neighbor lookup using index arithmetic

**Entropy Calculation:**
```rust
fn calculate_entropy(&self, cell: &Cell) -> f64 {
    if cell.collapsed {
        return f64::INFINITY; // Already collapsed
    }
    
    // Shannon entropy with weights
    let total_weight: f64 = cell.possibilities
        .iter()
        .map(|id| self.rules.get_weight(id) as f64)
        .sum();
    
    let entropy: f64 = cell.possibilities
        .iter()
        .map(|id| {
            let weight = self.rules.get_weight(id) as f64;
            let p = weight / total_weight;
            -p * p.log2()
        })
        .sum();
    
    // Add small random noise to break ties
    entropy - self.rng.gen::<f64>() * 0.001
}
```

**Weighted Random Selection:**
```rust
fn select_tile(&mut self, possibilities: &HashSet<TileId>) -> TileId {
    let total_weight: u32 = possibilities
        .iter()
        .map(|id| self.rules.get_weight(id))
        .sum();
    
    let mut roll = self.rng.gen_range(0..total_weight);
    
    for id in possibilities {
        let weight = self.rules.get_weight(id);
        if roll < weight {
            return *id;
        }
        roll -= weight;
    }
    
    unreachable!()
}
```

### Web Application Data Flow

**Generation Pipeline:**
```
User Input → State Update → Rule Generation → Wasm Call → Grid Result → Canvas Render
```

**Project Persistence:**
```typescript
interface ProjectData {
  version: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  tiles: Tile[];
  sockets: Socket[];
  config: GenerationConfig;
  thumbnail?: string; // base64 preview
}

async function saveProject(data: ProjectData): Promise<void> {
  const db = await openDB('wfc-projects', 1);
  await db.put('projects', data, data.name);
}

async function loadProject(name: string): Promise<ProjectData> {
  const db = await openDB('wfc-projects', 1);
  return await db.get('projects', name);
}
```

## Error Handling

### Core Library Errors

```rust
#[derive(Debug)]
pub enum WfcError {
    InvalidDimensions { width: usize, height: usize },
    NoTilesDefined,
    Contradiction { cell_index: usize },
    InvalidTileId { id: String },
    JsonParseError { message: String },
}

impl std::fmt::Display for WfcError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            WfcError::Contradiction { cell_index } => {
                write!(f, "Contradiction at cell {}: no valid tiles", cell_index)
            }
            // ... other cases
        }
    }
}
```

**Wasm Error Conversion:**
```rust
impl From<WfcError> for JsValue {
    fn from(err: WfcError) -> Self {
        JsValue::from_str(&err.to_string())
    }
}
```

### Web Application Error Handling

```typescript
async function handleGeneration() {
  try {
    setLoading(true);
    const grid = await wasmBridge.generate(tiles, config);
    setGeneratedGrid(grid);
    showNotification('Map generated successfully!', 'success');
  } catch (error) {
    if (error.message.includes('contradiction')) {
      showNotification(
        'Generation failed: Try adjusting rules or using a different seed',
        'error'
      );
    } else {
      showNotification(`Error: ${error.message}`, 'error');
    }
  } finally {
    setLoading(false);
  }
}
```

## Testing Strategy

This system will use a dual testing approach combining unit tests for specific examples and property-based tests for universal correctness properties.

### Unit Testing

Unit tests verify specific examples, edge cases, and integration points:

**Core Library (Rust):**
- Test specific tile configurations and expected outputs
- Test error conditions (invalid dimensions, empty tile sets)
- Test rule parsing from JSON
- Test Wasm bindings with mock JavaScript calls

**Web Application (TypeScript):**
- Test component rendering with mock data
- Test state management actions
- Test rule generation from socket assignments
- Test file upload handling
- Test canvas rendering with mock grids

### Property-Based Testing

Property-based tests verify universal properties across randomized inputs. Each test will run a minimum of 100 iterations.

**Testing Library:** 
- Rust: `proptest` crate
- TypeScript: `fast-check` library

**Test Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: wfc-web-app, Property {N}: {description}`
- Tests reference design document properties


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Core Algorithm Properties

**Property 1: Initialization Superposition**
*For any* grid dimensions and tile set, when the Model initializes, all cells should contain all possible tiles in their possibility sets.
**Validates: Requirements 13.1**

**Property 2: Collapsed Cell Singularity**
*For any* cell that has been collapsed, the cell should contain exactly one tile in its possibility set.
**Validates: Requirements 13.3**

**Property 3: Successful Grid Completeness**
*For any* successful generation run, all cells in the returned grid should be collapsed (have exactly one possibility).
**Validates: Requirements 13.6**

**Property 4: Contradiction Detection**
*For any* cell with zero possibilities, the algorithm should detect the contradiction and return a failure result.
**Validates: Requirements 13.7**

**Property 5: Deterministic Generation (Round-Trip)**
*For any* valid rule set and grid dimensions, running the algorithm twice with the same seed should produce identical grids.
**Validates: Requirements 13.8, 6.2**

**Property 6: Propagation Constraint Enforcement**
*For any* collapsed cell and its neighbors, after propagation, each neighbor's possibility set should only contain tiles that are valid according to adjacency rules.
**Validates: Requirements 13.4**

**Property 7: Output Grid Dimensions**
*For any* successful generation with width W and height H, the returned grid should have exactly W × H elements.
**Validates: Requirements 7.6**

### Rule Management Properties

**Property 8: Rule Storage and Retrieval**
*For any* adjacency rule added to the RuleSet, querying valid neighbors for that tile and direction should include the target tile.
**Validates: Requirements 14.1, 14.2**

**Property 9: Rule JSON Round-Trip**
*For any* valid RuleSet, serializing to JSON and then parsing should produce an equivalent RuleSet with the same tiles, weights, and adjacency constraints.
**Validates: Requirements 14.3**

**Property 10: Default Weight Assignment**
*For any* tile added without a specified weight, the tile should have a weight of 1.
**Validates: Requirements 14.5**

### Socket-Based Rule Generation Properties

**Property 11: Socket Matching Rule Generation**
*For any* two tiles with matching sockets on adjacent edges (e.g., tile A's right socket equals tile B's left socket), an adjacency rule should be generated allowing A to be placed left of B.
**Validates: Requirements 3.3**

**Property 12: Socket Assignment Storage**
*For any* tile and edge direction, assigning a socket ID should result in that socket ID being retrievable for that tile and direction.
**Validates: Requirements 3.1**

**Property 13: Socket Name Uniqueness**
*For any* set of sockets, all socket names should be unique within the system.
**Validates: Requirements 3.2**

**Property 14: Rule Regeneration on Socket Change**
*For any* tile set with socket assignments, changing a socket assignment should produce a different set of generated adjacency rules.
**Validates: Requirements 3.5**

### Tile Management Properties

**Property 15: Tile Creation Completeness**
*For any* valid tile input (ID, display name, sprite/color, weight), creating a tile should result in a tile object with all specified fields populated.
**Validates: Requirements 1.1**

**Property 16: Tile Weight Validation**
*For any* weight value between 1 and 100 (inclusive), the system should accept the weight; for any value outside this range, the system should reject it.
**Validates: Requirements 1.4**

**Property 17: Tile Update Propagation**
*For any* tile edit operation, the updated tile data should be reflected in the state store.
**Validates: Requirements 1.5**

**Property 18: Cascading Tile Deletion**
*For any* tile deletion, both the tile and all rules referencing that tile should be removed from the system.
**Validates: Requirements 1.6**

**Property 19: Tile Search Filtering**
*For any* search query, all returned tiles should match the query (by name or tag), and all tiles matching the query should be returned.
**Validates: Requirements 1.7**

### Sprite and File Handling Properties

**Property 20: Image Format Acceptance**
*For any* file with extension .png, .jpg, or .webp, the system should accept the upload; for any other extension, the system should reject it.
**Validates: Requirements 2.1**

**Property 21: Image Metadata Extraction**
*For any* valid image file, the system should correctly extract and display the image width and height.
**Validates: Requirements 2.2**

**Property 22: Sprite Sheet Tile Extraction**
*For any* sprite sheet with dimensions W×H and tile size T×T, the system should extract exactly (W/T) × (H/T) individual tiles.
**Validates: Requirements 2.4**

**Property 23: Sprite Persistence Round-Trip**
*For any* project with sprite images, saving and then loading the project should preserve all sprite data intact.
**Validates: Requirements 2.6**

### Validation Properties

**Property 24: Isolated Tile Detection**
*For any* tile with no valid neighbors in any direction, the validation system should detect and report the tile as isolated.
**Validates: Requirements 5.1, 5.3**

### Generation Configuration Properties

**Property 25: Dimension Validation**
*For any* width or height value between 1 and 500 (inclusive), the system should accept the dimensions; for any value outside this range, the system should reject it.
**Validates: Requirements 6.1**

**Property 26: Seed Generation Uniqueness**
*For any* two consecutive seed randomization operations, the generated seeds should be different with high probability.
**Validates: Requirements 6.3**

**Property 27: Retry on Failure Behavior**
*For any* generation that fails with retry enabled, the system should automatically attempt generation again with a new seed.
**Validates: Requirements 6.5**

### Wasm Integration Properties

**Property 28: UI State to JSON Conversion**
*For any* valid UI state (tiles, sockets, config), the conversion to JSON should produce a valid JSON string that can be parsed by the Rust library.
**Validates: Requirements 7.2**

**Property 29: Parameter Passing Correctness**
*For any* generation configuration, the width, height, and seed passed to the Wasm module should match the configured values.
**Validates: Requirements 7.3**

**Property 30: Complete Rule Set Transmission**
*For any* set of adjacency rules, all rules should be passed to the Wasm module during generation.
**Validates: Requirements 7.4**

**Property 31: Valid Grid Output**
*For any* successful algorithm execution, the returned grid should be a valid typed array with the correct length.
**Validates: Requirements 7.5, 7.6**

**Property 32: Contradiction Error Signaling**
*For any* generation that encounters a contradiction, the system should return an error (not a success result).
**Validates: Requirements 7.7**

### Canvas Rendering Properties

**Property 33: Grid Position Rendering Completeness**
*For any* generated grid, every grid position should be rendered on the canvas.
**Validates: Requirements 8.1**

**Property 34: High-DPI Scaling**
*For any* device pixel ratio R, the canvas dimensions should be scaled by R to support high-DPI displays.
**Validates: Requirements 8.2**

**Property 35: Zoom Clamping**
*For any* zoom operation, the resulting zoom level should be clamped between 0.5x and 4.0x.
**Validates: Requirements 8.4**

**Property 36: Pan Transform Application**
*For any* pan operation, the viewport transform should be updated to reflect the new pan offset.
**Validates: Requirements 8.5**

**Property 37: Tile Coordinate Calculation**
*For any* mouse position over the canvas, the calculated tile coordinates should correctly identify which tile is at that position.
**Validates: Requirements 8.7, 8.8**

### Export Properties

**Property 38: JSON Export Completeness**
*For any* generated map, the exported JSON should contain all tile IDs and metadata necessary to reconstruct the map.
**Validates: Requirements 10.2**

**Property 39: Tileset Export Completeness**
*For any* generated map, the exported tileset sprite sheet should contain all tiles that appear in the map.
**Validates: Requirements 10.3**

**Property 40: Clipboard Data Format**
*For any* grid export to clipboard, the data should be in valid text or CSV format.
**Validates: Requirements 10.4**

### Project Persistence Properties

**Property 41: Project Serialization Completeness**
*For any* project state, serialization should include all tiles, rules, sockets, and configuration settings.
**Validates: Requirements 11.1**

**Property 42: Project Save/Load Round-Trip**
*For any* project, saving and then loading should restore all tiles, rules, sockets, and settings to their original state.
**Validates: Requirements 11.2, 11.7**

**Property 43: Project Metadata Storage**
*For any* named project, the system should store the name along with creation and modification timestamps.
**Validates: Requirements 11.3**

**Property 44: Project Deletion Completeness**
*For any* project deletion, the project should be completely removed from storage and not appear in the project list.
**Validates: Requirements 11.5**

**Property 45: Project Export/Import Round-Trip**
*For any* project, exporting to JSON and then importing should preserve all project data.
**Validates: Requirements 11.6, 11.7**

**Property 46: Template Immutability**
*For any* loaded template, modifications to the loaded project should not affect the original template data.
**Validates: Requirements 12.3**

### Error Handling Properties

**Property 47: Invalid Dimension Error**
*For any* grid dimensions outside the valid range (width or height < 1 or > 500), the Core_Library should return an error.
**Validates: Requirements 17.1**

**Property 48: Empty Tile Set Error**
*For any* rule set with zero tiles, the Core_Library should return an error indicating at least one tile is required.
**Validates: Requirements 17.2**

**Property 49: JSON Parse Error Reporting**
*For any* invalid JSON input, the Core_Library should return an error with details about the parsing failure.
**Validates: Requirements 17.5**

**Property 50: Wasm Error Exception**
*For any* error in the Wasm module, a JavaScript exception should be thrown with a descriptive message.
**Validates: Requirements 15.6**


## Testing Strategy

### Overview

This project will employ a comprehensive dual testing approach that combines unit tests for specific scenarios with property-based tests for universal correctness guarantees. Both testing methodologies are complementary and necessary for ensuring system reliability.

### Testing Philosophy

- **Unit Tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property Tests**: Verify universal properties hold across all valid inputs through randomized testing
- **Together**: Provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness

### Core Library Testing (Rust)

**Testing Framework**: 
- Unit tests: Built-in Rust `#[test]` framework
- Property-based tests: `proptest` crate

**Property Test Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with: `// Feature: wfc-web-app, Property {N}: {description}`

**Test Coverage**:

1. **WFC Algorithm Tests**
   - Unit tests for specific tile configurations (2x2 grid with 2 tiles, 3x3 with 3 tiles)
   - Property tests for:
     - Property 1: Initialization superposition
     - Property 2: Collapsed cell singularity
     - Property 3: Successful grid completeness
     - Property 4: Contradiction detection
     - Property 5: Deterministic generation (critical round-trip)
     - Property 6: Propagation constraint enforcement
     - Property 7: Output grid dimensions

2. **RuleSet Tests**
   - Unit tests for specific rule configurations
   - Property tests for:
     - Property 8: Rule storage and retrieval
     - Property 9: Rule JSON round-trip (critical for serialization)
     - Property 10: Default weight assignment

3. **Wasm Binding Tests**
   - Unit tests for JavaScript interop with mock calls
   - Property tests for:
     - Property 31: Valid grid output
     - Property 32: Contradiction error signaling
     - Property 50: Wasm error exception

4. **Error Handling Tests**
   - Unit tests for specific error scenarios:
     - Zero-dimension grids
     - Negative dimensions
     - Empty tile sets
     - Malformed JSON
   - Property tests for:
     - Property 47: Invalid dimension error
     - Property 48: Empty tile set error
     - Property 49: JSON parse error reporting

**Example Property Test (Rust)**:
```rust
use proptest::prelude::*;

// Feature: wfc-web-app, Property 5: Deterministic generation
proptest! {
    #[test]
    fn test_deterministic_generation(
        width in 2usize..20,
        height in 2usize..20,
        seed in any::<u64>()
    ) {
        let rules = create_simple_ruleset();
        
        let mut model1 = Model::new(width, height, rules.clone(), Some(seed)).unwrap();
        let grid1 = model1.run().unwrap();
        
        let mut model2 = Model::new(width, height, rules, Some(seed)).unwrap();
        let grid2 = model2.run().unwrap();
        
        prop_assert_eq!(grid1, grid2);
    }
}
```

### Web Application Testing (TypeScript)

**Testing Framework**:
- Unit tests: Vitest with React Testing Library
- Property-based tests: `fast-check` library

**Property Test Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with: `// Feature: wfc-web-app, Property {N}: {description}`

**Test Coverage**:

1. **State Management Tests**
   - Unit tests for specific state transitions
   - Property tests for:
     - Property 15: Tile creation completeness
     - Property 16: Tile weight validation
     - Property 17: Tile update propagation
     - Property 18: Cascading tile deletion
     - Property 19: Tile search filtering

2. **Socket and Rule Generation Tests**
   - Unit tests for specific socket configurations
   - Property tests for:
     - Property 11: Socket matching rule generation
     - Property 12: Socket assignment storage
     - Property 13: Socket name uniqueness
     - Property 14: Rule regeneration on socket change

3. **File Handling Tests**
   - Unit tests for specific file types
   - Property tests for:
     - Property 20: Image format acceptance
     - Property 21: Image metadata extraction
     - Property 22: Sprite sheet tile extraction
     - Property 23: Sprite persistence round-trip

4. **Canvas Rendering Tests**
   - Unit tests for specific rendering scenarios
   - Property tests for:
     - Property 33: Grid position rendering completeness
     - Property 34: High-DPI scaling
     - Property 35: Zoom clamping
     - Property 36: Pan transform application
     - Property 37: Tile coordinate calculation

5. **Wasm Integration Tests**
   - Unit tests with mocked Wasm module
   - Property tests for:
     - Property 28: UI state to JSON conversion
     - Property 29: Parameter passing correctness
     - Property 30: Complete rule set transmission

6. **Project Persistence Tests**
   - Unit tests for specific project scenarios
   - Property tests for:
     - Property 41: Project serialization completeness
     - Property 42: Project save/load round-trip (critical)
     - Property 43: Project metadata storage
     - Property 44: Project deletion completeness
     - Property 45: Project export/import round-trip (critical)
     - Property 46: Template immutability

7. **Export Tests**
   - Unit tests for specific export formats
   - Property tests for:
     - Property 38: JSON export completeness
     - Property 39: Tileset export completeness
     - Property 40: Clipboard data format

**Example Property Test (TypeScript)**:
```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

// Feature: wfc-web-app, Property 42: Project save/load round-trip
describe('Project Persistence', () => {
  it('should preserve all data through save/load cycle', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryTile(), { minLength: 1, maxLength: 20 }),
        fc.array(arbitrarySocket(), { minLength: 1, maxLength: 10 }),
        arbitraryGenerationConfig(),
        async (tiles, sockets, config) => {
          const project = {
            name: 'test-project',
            tiles,
            sockets,
            config,
          };
          
          await saveProject(project);
          const loaded = await loadProject('test-project');
          
          expect(loaded).toEqual(project);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**End-to-End Scenarios**:
1. Create tiles → Define sockets → Generate map → Export PNG
2. Load template → Modify rules → Generate map → Save project
3. Create project → Save → Close app → Reload → Load project → Verify state

**Integration Test Focus**:
- Wasm module loading and initialization
- State persistence across page reloads
- File upload and download flows
- Canvas rendering with real Wasm-generated grids

### Test Organization

**Directory Structure**:
```
core/
  src/
    lib.rs
    model.rs
    ruleset.rs
  tests/
    integration_tests.rs
    property_tests.rs

web/
  src/
    components/
      TileManager.tsx
      TileManager.test.tsx
    store/
      appStore.ts
      appStore.test.ts
    utils/
      wasmBridge.ts
      wasmBridge.test.ts
  tests/
    property/
      tile-management.test.ts
      project-persistence.test.ts
      socket-rules.test.ts
```

### Critical Round-Trip Properties

The following properties are especially important as they validate data integrity through transformation cycles:

1. **Property 5**: Deterministic generation (same seed → same output)
2. **Property 9**: Rule JSON round-trip (serialize → parse → equivalent)
3. **Property 23**: Sprite persistence round-trip (save → load → intact sprites)
4. **Property 42**: Project save/load round-trip (save → load → identical state)
5. **Property 45**: Project export/import round-trip (export → import → preserved data)

These round-trip properties are critical for ensuring data integrity and should be prioritized in testing.

### Test Execution

**Development Workflow**:
```bash
# Core library tests
cd core
cargo test                    # Run all tests
cargo test --release          # Run with optimizations
cargo test property_          # Run only property tests

# Web application tests
cd web
npm test                      # Run all tests
npm test -- --run            # Run once (no watch)
npm test property            # Run only property tests
```

**Continuous Integration**:
- All tests must pass before merging
- Property tests run with 100 iterations minimum
- Coverage reports generated for unit tests
- Integration tests run against built Wasm module

### Performance Testing

While not part of the core correctness properties, performance should be monitored:

- Algorithm performance: Track generation time for various grid sizes
- Canvas rendering: Monitor FPS for large grids
- Wasm overhead: Measure JavaScript ↔ Wasm call overhead
- Memory usage: Track memory consumption for large projects

Performance benchmarks should be established but are not blocking for correctness.
