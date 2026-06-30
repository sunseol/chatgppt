use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use std::{
    fmt, fs,
    path::{Component, Path, PathBuf},
};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckforgeProjectArtifactWriteRequest {
    pub project_id: String,
    pub relative_path: String,
    pub content: ProjectArtifactContent,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum ProjectArtifactContent {
    Text { value: String },
    Base64 { value: String },
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckforgeProjectArtifactWriteEvidence {
    pub file_path: String,
    pub bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckforgeProjectArtifactError {
    code: &'static str,
    message: String,
}

impl DeckforgeProjectArtifactError {
    pub fn new(code: &'static str, message: String) -> Self {
        Self { code, message }
    }

    #[cfg(test)]
    fn code(&self) -> &'static str {
        self.code
    }
}

impl fmt::Display for DeckforgeProjectArtifactError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for DeckforgeProjectArtifactError {}

pub type ProjectArtifactResult<T> = Result<T, DeckforgeProjectArtifactError>;

pub fn write_project_artifact_at_root(
    root: &Path,
    request: &DeckforgeProjectArtifactWriteRequest,
) -> ProjectArtifactResult<DeckforgeProjectArtifactWriteEvidence> {
    let project_id = safe_project_id(&request.project_id)?;
    let relative_path = safe_relative_path(&request.relative_path)?;
    let bytes = content_bytes(&request.content)?;
    let file_path = root.join("projects").join(project_id).join(relative_path);
    let parent = file_path.parent().ok_or_else(|| {
        DeckforgeProjectArtifactError::new(
            "invalid_artifact_path",
            "project artifact path has no parent directory".to_owned(),
        )
    })?;
    fs::create_dir_all(parent).map_err(|error| {
        DeckforgeProjectArtifactError::new(
            "create_artifact_dir_failed",
            format!("failed to create artifact directory: {error}"),
        )
    })?;
    fs::write(&file_path, &bytes).map_err(|error| {
        DeckforgeProjectArtifactError::new(
            "write_artifact_failed",
            format!("failed to write project artifact: {error}"),
        )
    })?;
    Ok(DeckforgeProjectArtifactWriteEvidence {
        file_path: file_path.display().to_string(),
        bytes: bytes.len() as u64,
    })
}

fn content_bytes(content: &ProjectArtifactContent) -> ProjectArtifactResult<Vec<u8>> {
    match content {
        ProjectArtifactContent::Text { value } => Ok(value.as_bytes().to_vec()),
        ProjectArtifactContent::Base64 { value } => STANDARD.decode(value).map_err(|error| {
            DeckforgeProjectArtifactError::new(
                "invalid_base64_artifact",
                format!("artifact content is not valid base64: {error}"),
            )
        }),
    }
}

fn safe_project_id(value: &str) -> ProjectArtifactResult<&str> {
    if value.is_empty() || !value.chars().all(is_safe_identifier_char) {
        return Err(DeckforgeProjectArtifactError::new(
            "invalid_project_id",
            "project id may contain only ASCII letters, numbers, underscore, and dash".to_owned(),
        ));
    }
    Ok(value)
}

fn safe_relative_path(value: &str) -> ProjectArtifactResult<PathBuf> {
    if value.is_empty() || value.starts_with('/') {
        return Err(invalid_path_error());
    }
    let path = Path::new(value);
    let mut normalized = PathBuf::new();
    for component in path.components() {
        let Component::Normal(segment) = component else {
            return Err(invalid_path_error());
        };
        let Some(text) = segment.to_str() else {
            return Err(invalid_path_error());
        };
        if text.is_empty() || text.starts_with('.') || !text.chars().all(is_safe_path_char) {
            return Err(invalid_path_error());
        }
        normalized.push(text);
    }
    Ok(normalized)
}

fn invalid_path_error() -> DeckforgeProjectArtifactError {
    DeckforgeProjectArtifactError::new(
        "invalid_artifact_path",
        "artifact relative path must stay under the project and contain safe ASCII path segments"
            .to_owned(),
    )
}

fn is_safe_identifier_char(character: char) -> bool {
    character.is_ascii_alphanumeric() || character == '_' || character == '-'
}

fn is_safe_path_char(character: char) -> bool {
    is_safe_identifier_char(character) || character == '.'
}

#[cfg(test)]
mod tests {
    use super::{
        write_project_artifact_at_root, DeckforgeProjectArtifactWriteRequest,
        ProjectArtifactContent,
    };
    use std::{env, error::Error, fs};

    #[test]
    fn writes_base64_project_artifact_under_project_root() -> Result<(), Box<dyn Error>> {
        let root = env::temp_dir().join("deckforge_project_artifact_test_ok");
        if root.exists() {
            fs::remove_dir_all(&root)?;
        }
        let request = DeckforgeProjectArtifactWriteRequest {
            project_id: "project_001".to_owned(),
            relative_path: "slides/images/slide_001.v1.png".to_owned(),
            content: ProjectArtifactContent::Base64 {
                value: "iVBORw0KGgo=".to_owned(),
            },
        };

        let evidence = write_project_artifact_at_root(&root, &request)?;

        assert!(evidence
            .file_path
            .ends_with("projects/project_001/slides/images/slide_001.v1.png"));
        assert_eq!(evidence.bytes, 8);
        assert_eq!(
            fs::read(evidence.file_path)?,
            vec![137, 80, 78, 71, 13, 10, 26, 10]
        );
        fs::remove_dir_all(root)?;
        Ok(())
    }

    #[test]
    fn rejects_project_artifact_path_traversal() -> Result<(), Box<dyn Error>> {
        let root = env::temp_dir().join("deckforge_project_artifact_test_bad");
        let request = DeckforgeProjectArtifactWriteRequest {
            project_id: "project_001".to_owned(),
            relative_path: "../bad.png".to_owned(),
            content: ProjectArtifactContent::Text {
                value: "bad".to_owned(),
            },
        };

        let result = write_project_artifact_at_root(&root, &request);

        assert!(result.is_err());
        let Err(error) = result else {
            return Ok(());
        };
        assert_eq!(error.code(), "invalid_artifact_path");
        Ok(())
    }
}
