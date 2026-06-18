use crate::{
    codex_app_server_protocol::build_json_rpc_request,
    codex_app_server_smoke::{CodexAppServerSmokeError, SmokeResult},
};
use serde_json::Value;
use std::{
    io::{BufRead, BufReader, Write},
    process::{Child, ChildStdin, Command, Stdio},
    sync::mpsc::{self, Receiver, RecvTimeoutError},
    thread,
    time::{Duration, Instant},
};

pub(super) struct AppServerSession {
    child: Child,
    stdin: ChildStdin,
    receiver: Receiver<String>,
    next_id: u64,
    notifications: Vec<Value>,
}

impl Drop for AppServerSession {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl AppServerSession {
    pub(super) fn spawn() -> SmokeResult<Self> {
        let mut child = Command::new("codex")
            .arg("app-server")
            .arg("--stdio")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| {
                CodexAppServerSmokeError::new(
                    "spawn_failed",
                    format!("failed to start codex app-server: {error}"),
                )
            })?;
        let stdin = child.stdin.take().ok_or_else(|| {
            CodexAppServerSmokeError::new(
                "stdin_missing",
                "app-server stdin is unavailable".to_owned(),
            )
        })?;
        let stdout = child.stdout.take().ok_or_else(|| {
            CodexAppServerSmokeError::new(
                "stdout_missing",
                "app-server stdout is unavailable".to_owned(),
            )
        })?;
        let (sender, receiver) = mpsc::channel();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(value) => {
                        if sender.send(value).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });
        Ok(Self {
            child,
            stdin,
            receiver,
            next_id: 1,
            notifications: Vec::new(),
        })
    }

    pub(super) fn request(
        &mut self,
        method: &str,
        params: Value,
        timeout: Duration,
    ) -> SmokeResult<Value> {
        let id = self.next_id;
        self.next_id = self.next_id.checked_add(1).ok_or_else(|| {
            CodexAppServerSmokeError::new("id_overflow", "JSON-RPC request id overflow".to_owned())
        })?;
        let request = build_json_rpc_request(id, method, params);
        serde_json::to_writer(&mut self.stdin, &request).map_err(|error| {
            CodexAppServerSmokeError::new(
                "request_encode_failed",
                format!("failed to encode {method}: {error}"),
            )
        })?;
        self.stdin.write_all(b"\n").map_err(|error| {
            CodexAppServerSmokeError::new(
                "request_write_failed",
                format!("failed to write {method}: {error}"),
            )
        })?;
        self.stdin.flush().map_err(|error| {
            CodexAppServerSmokeError::new(
                "request_flush_failed",
                format!("failed to flush {method}: {error}"),
            )
        })?;
        let response = self.wait_for_response(id, method, timeout)?;
        if let Some(error) = response.get("error") {
            return Err(CodexAppServerSmokeError::new(
                "json_rpc_error",
                format!("{method} failed: {error}"),
            ));
        }
        Ok(response)
    }

    pub(super) fn wait_for_method(
        &mut self,
        method: &str,
        timeout: Duration,
    ) -> SmokeResult<Value> {
        let deadline = Instant::now() + timeout;
        loop {
            let message = self.read_message(deadline, method)?;
            self.capture_notification(&message);
            if message.get("method").and_then(Value::as_str) == Some(method) {
                return Ok(message);
            }
        }
    }

    pub(super) fn notifications(&self) -> &[Value] {
        &self.notifications
    }

    pub(super) fn take_notifications(&mut self) -> Vec<Value> {
        std::mem::take(&mut self.notifications)
    }

    fn wait_for_response(
        &mut self,
        id: u64,
        method: &str,
        timeout: Duration,
    ) -> SmokeResult<Value> {
        let deadline = Instant::now() + timeout;
        loop {
            let message = self.read_message(deadline, method)?;
            self.capture_notification(&message);
            if message.get("id").and_then(Value::as_u64) == Some(id) {
                return Ok(message);
            }
        }
    }

    fn read_message(&self, deadline: Instant, wait_target: &str) -> SmokeResult<Value> {
        let now = Instant::now();
        if now >= deadline {
            return Err(CodexAppServerSmokeError::new(
                "timeout",
                format!("timed out waiting for {wait_target}"),
            ));
        }
        let remaining = deadline.saturating_duration_since(now);
        let line = self
            .receiver
            .recv_timeout(remaining)
            .map_err(|error| match error {
                RecvTimeoutError::Timeout => CodexAppServerSmokeError::new(
                    "timeout",
                    format!("timed out waiting for {wait_target}"),
                ),
                RecvTimeoutError::Disconnected => CodexAppServerSmokeError::new(
                    "stdout_closed",
                    format!("app-server stdout closed while waiting for {wait_target}"),
                ),
            })?;
        serde_json::from_str(&line).map_err(|error| {
            CodexAppServerSmokeError::new(
                "protocol_parse_failed",
                format!("failed to parse app-server stdout JSON: {error}"),
            )
        })
    }

    fn capture_notification(&mut self, message: &Value) {
        if message.get("method").and_then(Value::as_str).is_some() {
            self.notifications.push(message.clone());
        }
    }
}
