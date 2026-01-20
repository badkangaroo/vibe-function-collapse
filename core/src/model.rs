use std::collections::HashSet;
use rand::prelude::*;
use crate::{TileId, Direction};
use crate::ruleset::RuleSet;
use crate::error::WfcError;

#[derive(Debug, Clone)]
pub struct Cell {
    pub collapsed: bool,
    pub possibilities: HashSet<TileId>,
}

#[derive(Debug, Clone)]
pub struct Model {
    width: usize,
    height: usize,
    grid: Vec<Cell>,
    rules: RuleSet,
    rng: StdRng,
}

impl Model {
    pub fn new(width: usize, height: usize, rules: RuleSet, seed: Option<u64>) -> Result<Model, WfcError> {
        // Requirement 17.1: Invalid Dimensions
        if width == 0 || height == 0 || width > 500 || height > 500 {
            return Err(WfcError::InvalidDimensions { width, height });
        }

        // Requirement 17.2: Test empty tile set error
        if rules.get_all_tile_ids().is_empty() {
            return Err(WfcError::NoTilesDefined);
        }

        let all_tiles: HashSet<TileId> = rules.get_all_tile_ids().into_iter().cloned().collect();
        
        // Initialize grid with all cells in superposition
        let grid = (0..width * height)
            .map(|_| Cell {
                collapsed: false,
                possibilities: all_tiles.clone(),
            })
            .collect();

        // Initialize RNG
        // Requirement 13.8: Deterministic generation with seed
        let rng = match seed {
            Some(s) => StdRng::seed_from_u64(s),
            None => StdRng::from_entropy(),
        };

        Ok(Model {
            width,
            height,
            grid,
            rules,
            rng,
        })
    }

    // Helper for grid indexing
    fn get_index(&self, x: usize, y: usize) -> usize {
        y * self.width + x
    }

    fn get_coords(&self, index: usize) -> (usize, usize) {
        (index % self.width, index / self.width)
    }

    // Task 3.3: Implement entropy calculation
    fn calculate_entropy(&mut self, cell_index: usize) -> f64 {
        let cell = &self.grid[cell_index];
        if cell.collapsed {
            return f64::INFINITY; // Already collapsed, shouldn't be picked
        }

        let total_weight: f64 = cell.possibilities
            .iter()
            .map(|id| self.rules.get_weight(id).unwrap_or(1) as f64)
            .sum();

        if total_weight == 0.0 {
            return 0.0; // Should handle contradiction elsewhere, but entropy is 0 here
        }

        let entropy: f64 = cell.possibilities
            .iter()
            .map(|id| {
                let weight = self.rules.get_weight(id).unwrap_or(1) as f64;
                let p = weight / total_weight;
                -p * p.log2()
            })
            .sum();

        // Add small random noise to break ties (Req 13.2)
        entropy - self.rng.gen::<f64>() * 0.001
    }

    fn find_lowest_entropy(&mut self) -> Option<usize> {
        let mut min_entropy = f64::INFINITY;
        let mut min_index = None;

        for i in 0..self.grid.len() {
            if !self.grid[i].collapsed {
                let entropy = self.calculate_entropy(i);
                if entropy < min_entropy {
                    min_entropy = entropy;
                    min_index = Some(i);
                }
            }
        }

        min_index
    }

    // Task 3.5: Implement cell collapse logic
    fn collapse_cell(&mut self, index: usize) -> Result<TileId, WfcError> {
        let cell = &mut self.grid[index];
        if cell.possibilities.is_empty() {
            return Err(WfcError::Contradiction);
        }

        let total_weight: u32 = cell.possibilities
            .iter()
            .map(|id| self.rules.get_weight(id).unwrap_or(1))
            .sum();

        if total_weight == 0 {
             return Err(WfcError::Contradiction);
        }

        let mut roll = self.rng.gen_range(0..total_weight);
        let mut selected_tile = None;

        // Sort possibilities for deterministic selection
        let mut sorted_possibilities: Vec<&TileId> = cell.possibilities.iter().collect();
        sorted_possibilities.sort();

        for id in sorted_possibilities {
            let weight = self.rules.get_weight(id).unwrap_or(1);
            if roll < weight {
                selected_tile = Some(id.clone());
                break;
            }
            roll -= weight;
        }

        let selected = selected_tile.expect("Weighted random selection failed");
        
        cell.collapsed = true;
        cell.possibilities.clear();
        cell.possibilities.insert(selected.clone());

        Ok(selected)
    }

    // Task 3.6: Implement constraint propagation
    fn get_neighbors(&self, index: usize) -> Vec<(usize, Direction)> {
        let (x, y) = self.get_coords(index);
        let mut neighbors = Vec::new();

        if y > 0 {
            neighbors.push((self.get_index(x, y - 1), Direction::Up));
        }
        if x < self.width - 1 {
            neighbors.push((self.get_index(x + 1, y), Direction::Right));
        }
        if y < self.height - 1 {
            neighbors.push((self.get_index(x, y + 1), Direction::Down));
        }
        if x > 0 {
            neighbors.push((self.get_index(x - 1, y), Direction::Left));
        }

        neighbors
    }

    fn propagate(&mut self, start_index: usize) -> Result<(), WfcError> {
        let mut stack = vec![start_index];

        while let Some(current_idx) = stack.pop() {
            let current_possibilities = self.grid[current_idx].possibilities.clone();
            
            // Check for contradiction
            if current_possibilities.is_empty() {
                return Err(WfcError::Contradiction);
            }

            let neighbors = self.get_neighbors(current_idx);

            for (neighbor_idx, direction) in neighbors {
                let neighbor = &mut self.grid[neighbor_idx];
                
                if neighbor.collapsed {
                    continue;
                }

                let original_count = neighbor.possibilities.len();
                
                // Keep only tiles in neighbor that are compatible with AT LEAST ONE tile in current_possibilities
                let mut allowed_in_neighbor = HashSet::new();
                for tile_c in &current_possibilities {
                    if let Some(valid_neighbors) = self.rules.get_valid_neighbors(tile_c, direction) {
                         allowed_in_neighbor.extend(valid_neighbors.iter().cloned());
                    }
                }

                neighbor.possibilities.retain(|tile_n| allowed_in_neighbor.contains(tile_n));

                if neighbor.possibilities.len() < original_count {
                    if neighbor.possibilities.is_empty() {
                        return Err(WfcError::Contradiction);
                    }
                    stack.push(neighbor_idx);
                }
            }
        }
        Ok(())
    }

    fn backtrack(&mut self, history: &mut Vec<(Vec<Cell>, usize, TileId)>) -> bool {
        while let Some((snapshot, index, tried_tile)) = history.pop() {
            self.grid = snapshot;
            
            // Remove the failed tile
            self.grid[index].possibilities.remove(&tried_tile);
            
            if self.grid[index].possibilities.is_empty() {
                continue;
            }
            
            if let Ok(_) = self.propagate(index) {
                return true;
            }
        }
        false
    }

    // Task 3.8: Implement main run loop
    pub fn run(&mut self) -> Result<Vec<TileId>, WfcError> {
        let mut history: Vec<(Vec<Cell>, usize, TileId)> = Vec::new();

        loop {
            // Find cell with lowest entropy
            if let Some(index) = self.find_lowest_entropy() {
                let snapshot = self.grid.clone();

                // Collapse it
                match self.collapse_cell(index) {
                    Ok(selected_tile) => {
                        history.push((snapshot, index, selected_tile));
                        
                        // Propagate constraints
                        if let Err(_) = self.propagate(index) {
                            if !self.backtrack(&mut history) {
                                return Err(WfcError::Contradiction);
                            }
                        }
                    },
                    Err(_) => {
                         // Contradiction encountered
                        if !self.backtrack(&mut history) {
                            return Err(WfcError::Contradiction);
                        }
                    }
                }
            } else {
                // All cells collapsed (or none left to collapse)
                break;
            }
        }

        // Validate completeness and construct result
        let result: Result<Vec<TileId>, WfcError> = self.grid.iter().map(|cell| {
             if cell.collapsed && cell.possibilities.len() == 1 {
                 Ok(cell.possibilities.iter().next().unwrap().clone())
             } else {
                 Err(WfcError::Contradiction) 
             }
        }).collect();

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    // Helper to create a simple RuleSet
    fn create_simple_ruleset() -> RuleSet {
        let mut rs = RuleSet::new();
        rs.add_tile("grass".to_string(), 10);
        rs.add_tile("water".to_string(), 1);
        
        // Grass next to Grass (all directions)
        rs.add_adjacency("grass".to_string(), "grass".to_string(), Direction::Up);
        rs.add_adjacency("grass".to_string(), "grass".to_string(), Direction::Down);
        rs.add_adjacency("grass".to_string(), "grass".to_string(), Direction::Left);
        rs.add_adjacency("grass".to_string(), "grass".to_string(), Direction::Right);

        // Water next to Water
        rs.add_adjacency("water".to_string(), "water".to_string(), Direction::Up);
        rs.add_adjacency("water".to_string(), "water".to_string(), Direction::Down);
        rs.add_adjacency("water".to_string(), "water".to_string(), Direction::Left);
        rs.add_adjacency("water".to_string(), "water".to_string(), Direction::Right);

        // Grass next to Water
        rs.add_adjacency("grass".to_string(), "water".to_string(), Direction::Right);
        rs.add_adjacency("water".to_string(), "grass".to_string(), Direction::Left);
        
        rs
    }

    #[test]
    fn test_2x2_basic() {
        let rules = create_simple_ruleset();
        let mut model = Model::new(2, 2, rules, Some(42)).expect("Model creation failed");
        let result = model.run();
        assert!(result.is_ok(), "Generation should succeed");
        let grid = result.unwrap();
        assert_eq!(grid.len(), 4);
    }

    #[test]
    fn test_contradiction() {
        let mut rules = RuleSet::new();
        rules.add_tile("a".to_string(), 1);
        rules.add_tile("b".to_string(), 1);
        // No adjacency rules -> contradiction
        
        let mut model = Model::new(2, 1, rules, Some(1)).expect("Model creation failed");
        let result = model.run();
        assert!(matches!(result, Err(WfcError::Contradiction)));
    }

    #[test]
    fn test_backtracking_success() {
        let mut rules = RuleSet::new();
        // Tiles: T1, T2 (start options), T3 (dead end), T4 (path), T5 (end)
        rules.add_tile("T1".to_string(), 100); // High weight to pick T1 first
        rules.add_tile("T2".to_string(), 1);
        rules.add_tile("T3".to_string(), 1);
        rules.add_tile("T4".to_string(), 1);
        rules.add_tile("T5".to_string(), 1);

        // Adjacency
        // T1 -> T3 (Right)
        rules.add_adjacency("T1".to_string(), "T3".to_string(), Direction::Right);
        rules.add_adjacency("T3".to_string(), "T1".to_string(), Direction::Left);

        // T2 -> T4 (Right)
        rules.add_adjacency("T2".to_string(), "T4".to_string(), Direction::Right);
        rules.add_adjacency("T4".to_string(), "T2".to_string(), Direction::Left);

        // T4 -> T5 (Right)
        rules.add_adjacency("T4".to_string(), "T5".to_string(), Direction::Right);
        rules.add_adjacency("T5".to_string(), "T4".to_string(), Direction::Left);

        // T3 has NO right neighbors defined.
        
        let mut model = Model::new(3, 1, rules, Some(1)).expect("Model creation failed");
        
        // Expected: A=T2, B=T4, C=T5.
        // Even though T1 has higher weight, it leads to dead end.
        let result = model.run();
        
        assert!(result.is_ok(), "Backtracking should find the solution");
        let grid = result.unwrap();
        assert_eq!(grid[0], "T2");
        assert_eq!(grid[1], "T4");
        assert_eq!(grid[2], "T5");
    }

    proptest! {
        // Property 1: Initialization Superposition
        #[test]
        fn prop_initialization_superposition(
            width in 1usize..10,
            height in 1usize..10
        ) {
            let rules = create_simple_ruleset();
            let model = Model::new(width, height, rules.clone(), None).unwrap();
            
            let all_tiles: HashSet<TileId> = rules.get_all_tile_ids().into_iter().cloned().collect();
            
            for cell in model.grid {
                prop_assert!(!cell.collapsed);
                prop_assert_eq!(cell.possibilities, all_tiles.clone());
            }
        }

        // Property 3: Successful Grid Completeness & Property 7: Output Grid Dimensions
        #[test]
        fn prop_successful_grid_completeness(
            width in 2usize..10,
            height in 2usize..10,
            seed in any::<u64>()
        ) {
            let rules = create_simple_ruleset();
            let mut model = Model::new(width, height, rules, Some(seed)).unwrap();
            
            match model.run() {
                Ok(grid) => {
                    prop_assert_eq!(grid.len(), width * height);
                },
                Err(WfcError::Contradiction) => {
                    // Contradiction is valid
                },
                Err(e) => prop_assert!(false, "Unexpected error: {:?}", e),
            }
        }

        // Property 5: Deterministic Generation
        #[test]
        fn prop_deterministic_generation(
            width in 2usize..10,
            height in 2usize..10,
            seed in any::<u64>()
        ) {
            let rules = create_simple_ruleset();
            
            let mut model1 = Model::new(width, height, rules.clone(), Some(seed)).unwrap();
            let res1 = model1.run();

            let mut model2 = Model::new(width, height, rules, Some(seed)).unwrap();
            let res2 = model2.run();

            match (res1, res2) {
                (Ok(g1), Ok(g2)) => prop_assert_eq!(g1, g2),
                (Err(e1), Err(e2)) => prop_assert_eq!(format!("{:?}", e1), format!("{:?}", e2)),
                _ => prop_assert!(false, "Deterministic generation failed: different outcomes"),
            }
        }

        // Property 6: Propagation Constraint Enforcement
        #[test]
        fn prop_propagation_constraint_enforcement(
            width in 2usize..8,
            height in 2usize..8,
            seed in any::<u64>()
        ) {
            let rules = create_simple_ruleset();
            let mut model = Model::new(width, height, rules.clone(), Some(seed)).unwrap();
            
            // We can't easily inspect intermediate states with the current public API (run() finishes everything).
            // But we can check the final result if it succeeds.
            // If the grid is valid, it means constraints are enforced.
            
            if let Ok(grid_vec) = model.run() {
                // Reconstruct grid for easier checking
                let grid_2d: Vec<Vec<TileId>> = (0..height).map(|y| {
                    (0..width).map(|x| grid_vec[y * width + x].clone()).collect()
                }).collect();

                for y in 0..height {
                    for x in 0..width {
                        let tile = &grid_2d[y][x];
                        
                        // Check neighbors
                        let neighbors = vec![
                            (x as isize, y as isize - 1, Direction::Up),
                            (x as isize + 1, y as isize, Direction::Right),
                            (x as isize, y as isize + 1, Direction::Down),
                            (x as isize - 1, y as isize, Direction::Left),
                        ];

                        for (nx, ny, dir) in neighbors {
                            if nx >= 0 && ny >= 0 && nx < width as isize && ny < height as isize {
                                let neighbor_tile = &grid_2d[ny as usize][nx as usize];
                                let allowed = rules.get_valid_neighbors(tile, dir);
                                
                                prop_assert!(allowed.is_some(), "Tile {} should have allowed neighbors in {:?}", tile, dir);
                                prop_assert!(allowed.unwrap().contains(neighbor_tile), 
                                    "Tile {} at ({},{}) has invalid neighbor {} at ({},{}) in dir {:?}", 
                                    tile, x, y, neighbor_tile, nx, ny, dir);
                            }
                        }
                    }
                }
            }
        }
    }
}
