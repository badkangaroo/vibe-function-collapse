use wasm_bindgen::prelude::*;
use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};
use crate::{TileId, Direction};
use crate::error::WfcError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TileInfo {
    pub id: TileId,
    #[serde(default = "default_weight")]
    pub weight: u32,
}

fn default_weight() -> u32 {
    1
}

#[derive(Serialize, Deserialize)]
struct RuleJson {
    from: TileId,
    to: TileId,
    direction: Direction,
}

#[derive(Serialize, Deserialize)]
struct RuleSetJson {
    tiles: Vec<TileInfo>,
    rules: Vec<RuleJson>,
}

#[wasm_bindgen]
#[derive(Debug, Clone, Default)]
pub struct RuleSet {
    // Fields are not pub to wasm (HashMap not supported), but we can use them effectively in Rust
    #[wasm_bindgen(skip)]
    pub tiles: HashMap<TileId, TileInfo>,
    #[wasm_bindgen(skip)]
    pub adjacency: HashMap<(TileId, Direction), HashSet<TileId>>,
}

#[wasm_bindgen]
impl RuleSet {
    #[wasm_bindgen(constructor)]
    pub fn new() -> RuleSet {
        RuleSet {
            tiles: HashMap::new(),
            adjacency: HashMap::new(),
        }
    }
}

// Internal Rust methods (not exposed to Wasm)
impl RuleSet {
    pub fn add_tile(&mut self, id: TileId, weight: u32) {
        self.tiles.insert(id.clone(), TileInfo { id, weight });
    }

    pub fn add_adjacency(&mut self, from: TileId, to: TileId, direction: Direction) {
        // Assume if A -> B in Direction, then B is a valid neighbor of A in Direction.
        // The adjacency map stores: (CurrentTile, Direction) -> AllowedNeighborTiles

        self.adjacency
            .entry((from, direction))
            .or_insert_with(HashSet::new)
            .insert(to);
    }

    pub fn get_tile_info(&self, id: &TileId) -> Option<&TileInfo> {
        self.tiles.get(id)
    }

    pub fn get_all_tiles(&self) -> Vec<&TileInfo> {
        self.tiles.values().collect()
    }

    pub fn get_all_tile_ids(&self) -> Vec<&TileId> {
        self.tiles.keys().collect()
    }

    pub fn get_valid_neighbors(&self, tile: &TileId, direction: Direction) -> Option<&HashSet<TileId>> {
        self.adjacency.get(&(tile.clone(), direction))
    }

    pub fn to_json_string(&self) -> Result<String, WfcError> {
        let json = RuleSetJson {
            tiles: self.tiles.values().cloned().collect(),
            rules: self.adjacency.iter().flat_map(|((from, dir), set)| {
                set.iter().map(move |to| RuleJson {
                    from: from.clone(),
                    to: to.clone(),
                    direction: *dir,
                })
            }).collect(),
        };
        serde_json::to_string(&json)
            .map_err(|e| WfcError::JsonParseError(e.to_string()))
    }

    pub fn from_json(json: &str) -> Result<RuleSet, WfcError> {
        let parsed: RuleSetJson = serde_json::from_str(json)
            .map_err(|e| WfcError::JsonParseError(e.to_string()))?;

        let mut rule_set = RuleSet::new();

        for tile in parsed.tiles {
            rule_set.add_tile(tile.id, tile.weight);
        }

        for rule in parsed.rules {
            // Verify tiles exist?
            // Requirement 5.1 says "detect tiles with no valid neighbors", checking existence here is good practice but maybe not strictly required to fail if loose strings are passed.
            // However, strictly speaking, rules should involve known tiles.

            if !rule_set.tiles.contains_key(&rule.from) {
                return Err(WfcError::InvalidTileId(rule.from));
            }
            if !rule_set.tiles.contains_key(&rule.to) {
                return Err(WfcError::InvalidTileId(rule.to));
            }

            rule_set.add_adjacency(rule.from, rule.to, rule.direction);
        }

        // Requirement 17.2: Test empty tile set error
        if rule_set.tiles.is_empty() {
            return Err(WfcError::NoTilesDefined);
        }

        Ok(rule_set)
    }
}

// Wasm-exposed methods
#[wasm_bindgen]
impl RuleSet {
    #[wasm_bindgen]
    pub fn add_tile_wasm(&mut self, id: String, weight: u32) {
        self.add_tile(id, weight);
    }

    #[wasm_bindgen]
    pub fn add_adjacency_wasm(&mut self, from: String, to: String, direction: String) {
        let dir = match direction.as_str() {
            "Up" => Direction::Up,
            "Down" => Direction::Down,
            "Left" => Direction::Left,
            "Right" => Direction::Right,
            _ => return, // Invalid direction, silently ignore
        };
        self.add_adjacency(from, to, dir);
    }

    #[wasm_bindgen]
    pub fn get_weight(&self, tile_id: &str) -> Option<u32> {
        self.tiles.get(tile_id).map(|info| info.weight)
    }

    #[wasm_bindgen]
    pub fn to_json(&self) -> Result<JsValue, JsValue> {
        let json_str = self.to_json_string()
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok(JsValue::from_str(&json_str))
    }

    #[wasm_bindgen]
    pub fn from_json_wasm(json: &str) -> Result<RuleSet, JsValue> {
        RuleSet::from_json(json)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn test_add_tile_and_adjacency() {
        let mut rs = RuleSet::new();
        rs.add_tile("grass".to_string(), 10);
        rs.add_tile("water".to_string(), 1);
        rs.add_adjacency("grass".to_string(), "water".to_string(), Direction::Right);

        // Check tiles
        assert!(rs.tiles.contains_key("grass"));
        assert_eq!(rs.tiles.get("grass").unwrap().weight, 10);

        // Check adjacency
        let neighbors = rs.get_valid_neighbors(&"grass".to_string(), Direction::Right);
        assert!(neighbors.is_some());
        assert!(neighbors.unwrap().contains("water"));

        // Check non-existent
        let neighbors_up = rs.get_valid_neighbors(&"grass".to_string(), Direction::Up);
        assert!(neighbors_up.is_none());
    }

    #[test]
    fn test_get_weight() {
        let mut rs = RuleSet::new();
        rs.add_tile("tile1".to_string(), 42);
        assert_eq!(rs.get_weight(&"tile1".to_string()), Some(42));
        assert_eq!(rs.get_weight(&"missing".to_string()), None);
    }

    #[test]
    fn test_to_json_roundtrip() {
        let mut rs = RuleSet::new();
        rs.add_tile("a".to_string(), 5);
        rs.add_tile("b".to_string(), 3);
        rs.add_adjacency("a".to_string(), "b".to_string(), Direction::Down);
        let json_str = rs.to_json_string().expect("to_json_string should succeed");
        let rs2 = RuleSet::from_json(&json_str).expect("from_json should succeed");
        assert_eq!(rs2.tiles.len(), 2);
        let neigh = rs2.get_valid_neighbors(&"a".to_string(), Direction::Down).unwrap();
        assert!(neigh.contains("b"));
    }

    #[test]
    fn test_get_tile_info_and_all_tiles() {
        let mut rs = RuleSet::new();
        rs.add_tile("grass".to_string(), 10);
        rs.add_tile("water".to_string(), 1);
        rs.add_tile("sand".to_string(), 5);

        // Test get_tile_info
        let grass_info = rs.get_tile_info(&"grass".to_string()).expect("grass tile should exist");
        assert_eq!(grass_info.id, "grass");
        assert_eq!(grass_info.weight, 10);

        let water_info = rs.get_tile_info(&"water".to_string()).expect("water tile should exist");
        assert_eq!(water_info.id, "water");
        assert_eq!(water_info.weight, 1);

        assert!(rs.get_tile_info(&"nonexistent".to_string()).is_none());

        // Test get_all_tiles
        let all_tiles = rs.get_all_tiles();
        assert_eq!(all_tiles.len(), 3);
        let tile_ids_from_all_tiles: HashSet<TileId> = all_tiles.iter().map(|t| t.id.clone()).collect();
        assert!(tile_ids_from_all_tiles.contains("grass"));
        assert!(tile_ids_from_all_tiles.contains("water"));
        assert!(tile_ids_from_all_tiles.contains("sand"));

        // Test get_all_tile_ids
        let all_tile_ids = rs.get_all_tile_ids();
        assert_eq!(all_tile_ids.len(), 3);
        let tile_ids_set: HashSet<&TileId> = all_tile_ids.into_iter().collect();
        assert!(tile_ids_set.contains(&"grass".to_string()));
        assert!(tile_ids_set.contains(&"water".to_string()));
        assert!(tile_ids_set.contains(&"sand".to_string()));
    }

    #[test]
    fn test_from_json_basic() {
        let json = r#"{
            "tiles": [
                { "id": "grass", "weight": 10 },
                { "id": "water", "weight": 1 }
            ],
            "rules": [
                { "from": "grass", "to": "water", "direction": "Right" }
            ]
        }"#;

        let rs = RuleSet::from_json(json).expect("Should parse valid JSON");
        assert_eq!(rs.tiles.len(), 2);
        assert!(rs.get_valid_neighbors(&"grass".to_string(), Direction::Right).unwrap().contains("water"));
    }

    proptest! {
        #[test]
        fn test_rule_storage_and_retrieval(
            tile_id in "[a-z]+",
            weight in 1u32..100,
            neighbor_id in "[a-z]+"
        ) {
            let mut rs = RuleSet::new();
            rs.add_tile(tile_id.clone(), weight);
            rs.add_tile(neighbor_id.clone(), weight); // Ensure neighbor exists (though add_adjacency doesn't strictly check in current impl, logical consistency is good)

            rs.add_adjacency(tile_id.clone(), neighbor_id.clone(), Direction::Up);

            let stored_weight = rs.tiles.get(&tile_id).unwrap().weight;
            prop_assert_eq!(stored_weight, weight);

            let neighbors = rs.get_valid_neighbors(&tile_id, Direction::Up);
            prop_assert!(neighbors.is_some());
            prop_assert!(neighbors.unwrap().contains(&neighbor_id));
        }

        #[test]
        fn test_json_parsing_round_trip(
            start_id in "[a-z]{1,5}",
            end_id in "[a-z]{1,5}",
            weight in 1u32..100
        ) {
            // Construct a valid JSON object representation
            // We use simple construction here to ensure validity
            let direction = "Right";
            let json = format!(r#"{{
                "tiles": [
                    {{ "id": "{}", "weight": {} }},
                    {{ "id": "{}", "weight": {} }}
                ],
                "rules": [
                    {{ "from": "{}", "to": "{}", "direction": "{}" }}
                ]
            }}"#, start_id, weight, end_id, weight, start_id, end_id, direction);

            let rs = RuleSet::from_json(&json);

            // It might fail if start_id == end_id in specific map implementations or if empty strings,
            // but our regex [a-z]{1,5} ensures non-empty.
            // Also duplicate keys in JSON tiles array: if start_id == end_id, we list it twice.
            // Standard JSON parsers might allow duplicate keys or last wins.
            // But conceptually we are defining the same tile twice. Our implementation overwrites.

            prop_assert!(rs.is_ok(), "JSON parse failed: {:?}", rs.err());
            let rs = rs.unwrap();

            prop_assert!(rs.tiles.contains_key(&start_id));
            prop_assert!(rs.get_valid_neighbors(&start_id, Direction::Right).unwrap().contains(&end_id));
        }

        #[test]
        fn test_default_weight(
           id in "[a-z]+"
        ) {
             let json = format!(r#"{{
                "tiles": [
                    {{ "id": "{}" }}
                ],
                "rules": []
            }}"#, id);

            let rs = RuleSet::from_json(&json).expect("Should parse");
            prop_assert_eq!(rs.tiles.get(&id).unwrap().weight, 1);
        }
    }
}
