pub mod model;
pub mod ruleset;
pub mod error;
pub mod wasm;

use serde::{Deserialize, Serialize};

pub type TileId = String;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Direction {
    Up,
    Right,
    Down,
    Left,
}

impl Direction {
    pub fn opposite(&self) -> Self {
        match self {
            Direction::Up => Direction::Down,
            Direction::Right => Direction::Left,
            Direction::Down => Direction::Up,
            Direction::Left => Direction::Right,
        }
    }

    /// Rotate direction clockwise by 90 degrees
    pub fn rotate_clockwise(&self) -> Self {
        match self {
            Direction::Up => Direction::Right,
            Direction::Right => Direction::Down,
            Direction::Down => Direction::Left,
            Direction::Left => Direction::Up,
        }
    }

    /// Rotate direction counter-clockwise by 90 degrees
    pub fn rotate_counter_clockwise(&self) -> Self {
        match self {
            Direction::Up => Direction::Left,
            Direction::Right => Direction::Up,
            Direction::Down => Direction::Right,
            Direction::Left => Direction::Down,
        }
    }
}

/// Symmetry type for tile rotation/reflection
/// Based on the original WFC symmetry system from mxgmn/WaveFunctionCollapse
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum SymmetryType {
    /// Full symmetry (all rotations and reflections are identical) - 1 variant
    X,
    /// Horizontal/vertical reflection symmetry - 2 variants
    I,
    /// T-shaped symmetry - 4 variants
    T,
    /// L-shaped symmetry - 4 variants
    L,
    /// Diagonal reflection symmetry - 2 variants
    #[serde(rename = "\\")]
    Backslash,
    /// F-shaped symmetry - 8 variants (all rotations and reflections)
    F,
    /// No symmetry - 8 variants (all rotations and reflections)
    N,
}

impl SymmetryType {
    /// Get the number of variants this symmetry type produces
    pub fn variant_count(&self) -> usize {
        match self {
            SymmetryType::X => 1,
            SymmetryType::I => 2,
            SymmetryType::T => 4,
            SymmetryType::L => 4,
            SymmetryType::Backslash => 2,
            SymmetryType::F => 8,
            SymmetryType::N => 8,
        }
    }

    /// Get the transformations (rotation + reflection) for this symmetry type
    /// Returns a vector of (rotation_degrees, reflect_horizontal, reflect_vertical)
    pub fn transformations(&self) -> Vec<(u16, bool, bool)> {
        match self {
            SymmetryType::X => vec![(0, false, false)],
            SymmetryType::I => vec![(0, false, false), (0, true, false)],
            SymmetryType::T => vec![(0, false, false), (90, false, false), (180, false, false), (270, false, false)],
            SymmetryType::L => vec![(0, false, false), (90, false, false), (180, false, false), (270, false, false)],
            SymmetryType::Backslash => vec![(0, false, false), (0, true, true)],
            SymmetryType::F => vec![
                (0, false, false), (90, false, false), (180, false, false), (270, false, false),
                (0, true, false), (90, true, false), (180, true, false), (270, true, false),
            ],
            SymmetryType::N => vec![
                (0, false, false), (90, false, false), (180, false, false), (270, false, false),
                (0, true, false), (90, true, false), (180, true, false), (270, true, false),
            ],
        }
    }
}
