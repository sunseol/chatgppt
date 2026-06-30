const REDACTED: &str = "[redacted]";

pub(crate) fn redact_sensitive_text(text: &str) -> String {
    let bearer_redacted = redact_bearer_tokens(text);
    let assignment_redacted = [
        "OPENAI_API_KEY",
        "CODEX_SESSION",
        "api_key",
        "token",
        "password",
        "secret",
        "session",
    ]
    .iter()
    .fold(bearer_redacted, |current, key| {
        redact_secret_assignments(&current, key)
    });
    redact_codex_auth_paths(&assignment_redacted)
}

fn redact_bearer_tokens(text: &str) -> String {
    let mut output = String::new();
    let mut cursor = 0;
    let lower = text.to_ascii_lowercase();
    while let Some(relative) = lower[cursor..].find("bearer") {
        let start = cursor + relative;
        let after_word = start + "bearer".len();
        if !text[after_word..]
            .chars()
            .next()
            .is_some_and(char::is_whitespace)
        {
            output.push_str(&text[cursor..after_word]);
            cursor = after_word;
            continue;
        }

        output.push_str(&text[cursor..after_word]);
        let mut token_start = after_word;
        while let Some(character) = text[token_start..].chars().next() {
            if !character.is_whitespace() {
                break;
            }
            output.push(character);
            token_start += character.len_utf8();
        }
        output.push_str(REDACTED);
        cursor = skip_until_token_boundary(text, token_start);
    }
    output.push_str(&text[cursor..]);
    output
}

fn redact_secret_assignments(text: &str, key: &str) -> String {
    let mut output = String::new();
    let mut cursor = 0;
    let lower = text.to_ascii_lowercase();
    let key_lower = key.to_ascii_lowercase();

    while let Some(relative) = lower[cursor..].find(&key_lower) {
        let start = cursor + relative;
        let after_key = start + key.len();
        output.push_str(&text[cursor..after_key]);

        let mut index = after_key;
        while let Some(character) = text[index..].chars().next() {
            if !character.is_whitespace() {
                break;
            }
            output.push(character);
            index += character.len_utf8();
        }

        let Some(separator) = text[index..].chars().next() else {
            cursor = index;
            break;
        };
        if separator != '=' && separator != ':' {
            cursor = index;
            continue;
        }
        output.push(separator);
        index += separator.len_utf8();

        while let Some(character) = text[index..].chars().next() {
            if !character.is_whitespace() {
                break;
            }
            output.push(character);
            index += character.len_utf8();
        }

        output.push_str(REDACTED);
        cursor = skip_until_token_boundary(text, index);
    }

    output.push_str(&text[cursor..]);
    output
}

fn redact_codex_auth_paths(text: &str) -> String {
    text.split_whitespace()
        .map(|part| {
            if part.contains(".codex/auth.json") {
                REDACTED.to_owned()
            } else {
                part.to_owned()
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn skip_until_token_boundary(text: &str, mut index: usize) -> usize {
    while let Some(character) = text[index..].chars().next() {
        if character.is_whitespace() || character == '"' || character == '\'' {
            break;
        }
        index += character.len_utf8();
    }
    index
}

#[cfg(test)]
mod tests {
    use super::redact_sensitive_text;

    #[test]
    fn redacts_bearer_and_api_key_values() {
        let text = "OPENAI_API_KEY=sk-live-secret Authorization: Bearer codex.session.secret";

        let redacted = redact_sensitive_text(text);

        assert_eq!(
            redacted,
            "OPENAI_API_KEY=[redacted] Authorization: Bearer [redacted]"
        );
    }

    #[test]
    fn redacts_codex_auth_paths() {
        let text = "using /Users/jake/.codex/auth.json for status";

        let redacted = redact_sensitive_text(text);

        assert_eq!(redacted, "using [redacted] for status");
    }
}
