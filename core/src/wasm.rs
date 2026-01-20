use wasm_bindgen::prelude::*;
use crate::model::Model;
use crate::ruleset::RuleSet;
use crate::error::WfcError;

impl From<WfcError> for JsValue {
    fn from(error: WfcError) -> Self {
        JsValue::from_str(&error.to_string())
    }
}

#[wasm_bindgen]
pub struct WfcModel {
    model: Option<Model>,
    width: usize,
    height: usize,
    seed: Option<u64>,
    // Store the result here so we can retrieve it later
    result: Option<Vec<String>>, 
}

#[wasm_bindgen]
impl WfcModel {
    #[wasm_bindgen(constructor)]
    pub fn new(width: usize, height: usize, seed: Option<u64>) -> Result<WfcModel, JsValue> {
        // Requirements 15.1, 15.2
        if width == 0 || height == 0 || width > 500 || height > 500 {
            return Err(WfcError::InvalidDimensions { width, height }.into());
        }

        Ok(WfcModel {
            model: None,
            width,
            height,
            seed,
            result: None,
        })
    }

    #[wasm_bindgen]
    pub fn load_rules(&mut self, rules_json: &str) -> Result<(), JsValue> {
        // Requirement 15.3
        let rules = RuleSet::from_json(rules_json)?;
        
        // Initialize the model with the loaded rules
        // We re-create the model whenever rules are loaded
        self.model = Some(Model::new(self.width, self.height, rules, self.seed)?);
        self.result = None; // Reset result
        
        Ok(())
    }

    #[wasm_bindgen]
    pub fn run(&mut self) -> Result<bool, JsValue> {
        // Requirement 15.4
        match &mut self.model {
            Some(model) => {
                match model.run() {
                    Ok(grid) => {
                        self.result = Some(grid);
                        Ok(true)
                    },
                    Err(WfcError::Contradiction) => {
                        self.result = None;
                        Ok(false)
                    },
                    Err(e) => Err(e.into()),
                }
            },
            None => Err(JsValue::from_str("Model not initialized. Call load_rules() first.")),
        }
    }

    #[wasm_bindgen]
    pub fn get_grid(&self) -> Result<JsValue, JsValue> {
        // Requirement 15.5: Return grid to JavaScript
        match &self.result {
            Some(grid) => {
                serde_wasm_bindgen::to_value(grid)
                    .map_err(|e| JsValue::from_str(&e.to_string()))
            }
            None => Err(JsValue::from_str("No generated grid available. Run successfully first.")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ruleset::RuleSet;

    // Note: Testing Wasm bindings in standard `cargo test` is difficult because `JsValue` 
    // interactions usually require a Wasm environment.
    // However, we can test the logic structure if we conditionally compile.
    
    #[test]
    #[cfg(target_arch = "wasm32")] // Only run on wasm32
    fn test_error_conversion() {
        let err = WfcError::NoTilesDefined;
        let js_val: JsValue = err.into();
        // Can't easily assert content of JsValue without js-sys or web-sys in test env
    }
}
