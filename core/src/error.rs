use std::fmt;

#[derive(Debug)]
pub enum WfcError {
    InvalidDimensions { width: usize, height: usize },
    NoTilesDefined,
    Contradiction,
    InvalidTileId(String),
    JsonParseError(String),
}

impl fmt::Display for WfcError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            WfcError::InvalidDimensions { width, height } => write!(f, "Invalid dimensions: {}x{}", width, height),
            WfcError::NoTilesDefined => write!(f, "No tiles defined in the rule set"),
            WfcError::Contradiction => write!(f, "Contradiction reached, generation failed"),
            WfcError::InvalidTileId(id) => write!(f, "Invalid tile ID: {}", id),
            WfcError::JsonParseError(msg) => write!(f, "JSON parse error: {}", msg),
        }
    }
}

impl std::error::Error for WfcError {}
