use std::fmt;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexCliCommandError {
    code: &'static str,
    message: String,
}

impl CodexCliCommandError {
    pub fn new(code: &'static str, message: String) -> Self {
        Self { code, message }
    }
}

impl fmt::Display for CodexCliCommandError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for CodexCliCommandError {}

pub type CodexCliCommandResult<T> = Result<T, CodexCliCommandError>;
