use serde_json::{json, Value};

#[derive(Default)]
pub(super) struct SmokeAccumulator {
    pub(super) thread_id: Option<String>,
    pub(super) turn_id: Option<String>,
    pub(super) turn_completed: bool,
    pub(super) event_methods: Vec<String>,
    pub(super) final_text: Option<String>,
}

impl SmokeAccumulator {
    pub(super) fn observe(&mut self, message: &Value) {
        let Some(method) = string_at(message, &["method"]) else {
            return;
        };
        if !self.event_methods.iter().any(|seen| seen == method) {
            self.event_methods.push(method.to_owned());
        }
        if let Some(thread_id) = string_at(message, &["params", "threadId"]) {
            self.thread_id = Some(thread_id.to_owned());
        }
        if let Some(turn_id) = string_at(message, &["params", "turnId"]) {
            self.turn_id = Some(turn_id.to_owned());
        }
        if let Some(turn_id) = string_at(message, &["params", "turn", "id"]) {
            self.turn_id = Some(turn_id.to_owned());
        }
        if let Some(text) = string_at(message, &["params", "item", "text"]) {
            self.final_text = Some(text.to_owned());
        }
        if method == "turn/completed" {
            self.turn_completed = true;
        }
    }
}

pub(super) fn build_json_rpc_request(id: u64, method: &str, params: Value) -> Value {
    json!({
        "id": id,
        "method": method,
        "params": params
    })
}

pub(super) fn smoke_output_schema() -> Value {
    json!({
        "type": "object",
        "additionalProperties": false,
        "required": ["artifact", "stage", "mock", "fixture", "status"],
        "properties": {
            "artifact": { "type": "string" },
            "stage": { "type": "string" },
            "mock": { "type": "boolean" },
            "fixture": { "type": "boolean" },
            "status": { "type": "string" }
        }
    })
}

pub(super) fn first_string_at<'a>(value: &'a Value, paths: &[&[&str]]) -> Option<&'a str> {
    paths.iter().find_map(|path| string_at(value, path))
}

fn string_at<'a>(value: &'a Value, path: &[&str]) -> Option<&'a str> {
    let mut current = value;
    for key in path {
        current = current.get(*key)?;
    }
    current.as_str()
}

#[cfg(test)]
mod tests {
    use super::{build_json_rpc_request, SmokeAccumulator};
    use serde_json::json;

    #[test]
    fn builds_initialize_request_with_client_info() {
        let request = build_json_rpc_request(
            1,
            "initialize",
            json!({
                "clientInfo": {
                    "name": "deckforge-live-smoke",
                    "version": "0.1.0"
                },
                "capabilities": {
                    "experimentalApi": true
                }
            }),
        );

        assert_eq!(request["id"], 1);
        assert_eq!(request["method"], "initialize");
        assert_eq!(
            request["params"]["clientInfo"]["name"],
            "deckforge-live-smoke"
        );
    }

    #[test]
    fn extracts_turn_ids_and_final_text_from_notifications() {
        let mut accumulator = SmokeAccumulator::default();

        accumulator.observe(&json!({
            "method": "turn/started",
            "params": {
                "threadId": "thread_1",
                "turn": { "id": "turn_1" }
            }
        }));
        accumulator.observe(&json!({
            "method": "item/completed",
            "params": {
                "threadId": "thread_1",
                "turnId": "turn_1",
                "item": {
                    "text": "{\"artifact\":\"deckforge_live_current_smoke\"}"
                }
            }
        }));
        accumulator.observe(&json!({
            "method": "turn/completed",
            "params": {
                "threadId": "thread_1",
                "turnId": "turn_1"
            }
        }));

        assert_eq!(accumulator.thread_id.as_deref(), Some("thread_1"));
        assert_eq!(accumulator.turn_id.as_deref(), Some("turn_1"));
        assert_eq!(
            accumulator.final_text.as_deref(),
            Some("{\"artifact\":\"deckforge_live_current_smoke\"}")
        );
        assert_eq!(
            accumulator.event_methods,
            ["turn/started", "item/completed", "turn/completed"]
        );
        assert!(accumulator.turn_completed);
    }
}
