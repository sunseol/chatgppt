use std::{
    io::Read,
    sync::{Arc, Mutex},
};

const STDERR_TAIL_LIMIT: usize = 4_000;

pub(super) fn capture_stderr_tail(mut stderr: impl Read, stderr_tail: Arc<Mutex<String>>) {
    let mut buffer = [0_u8; 512];
    loop {
        let count = match stderr.read(&mut buffer) {
            Ok(0) => return,
            Ok(count) => count,
            Err(_) => return,
        };
        let chunk = String::from_utf8_lossy(&buffer[..count]);
        if let Ok(mut tail) = stderr_tail.lock() {
            tail.push_str(&chunk);
            trim_stderr_tail(&mut tail);
        }
    }
}

pub(super) fn append_stderr_tail(message: String, stderr_tail: &str) -> String {
    let trimmed = stderr_tail.trim();
    if trimmed.is_empty() {
        return message;
    }
    format!("{message}; app-server stderr: {trimmed}")
}

fn trim_stderr_tail(tail: &mut String) {
    if tail.len() <= STDERR_TAIL_LIMIT {
        return;
    }
    let mut start = tail.len().saturating_sub(STDERR_TAIL_LIMIT);
    while start < tail.len() && !tail.is_char_boundary(start) {
        start += 1;
    }
    tail.replace_range(..start, "");
}

#[cfg(test)]
mod tests {
    use super::{append_stderr_tail, trim_stderr_tail, STDERR_TAIL_LIMIT};

    #[test]
    fn appends_stderr_tail_to_stdout_closed_message() {
        let message = append_stderr_tail(
            "app-server stdout closed while waiting for initialize".to_owned(),
            "Error: missing auth token\n",
        );

        assert!(message.contains("stdout closed while waiting for initialize"));
        assert!(message.contains("app-server stderr: Error: missing auth token"));
    }

    #[test]
    fn keeps_stderr_tail_bounded() {
        let mut tail = "x".repeat(STDERR_TAIL_LIMIT + 128);

        trim_stderr_tail(&mut tail);

        assert_eq!(tail.len(), STDERR_TAIL_LIMIT);
    }
}
