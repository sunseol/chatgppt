use serde::{Deserialize, Serialize};
use std::{
    fmt, fs,
    path::{Path, PathBuf},
    process::Command,
};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckforgeProjectFolderRequest {
    pub project_id: String,
    pub filename: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckforgeProjectFolderEvidence {
    pub directory_path: String,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckforgeProjectFolderError {
    code: &'static str,
    message: String,
}

impl DeckforgeProjectFolderError {
    pub fn new(code: &'static str, message: String) -> Self {
        Self { code, message }
    }

    #[cfg(test)]
    fn code(&self) -> &'static str {
        self.code
    }
}

impl fmt::Display for DeckforgeProjectFolderError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for DeckforgeProjectFolderError {}

pub type ProjectFolderResult<T> = Result<T, DeckforgeProjectFolderError>;

pub fn prepare_project_folder_at_root(
    root: &Path,
    request: &DeckforgeProjectFolderRequest,
) -> ProjectFolderResult<DeckforgeProjectFolderEvidence> {
    let project_id = safe_project_id(&request.project_id)?;
    let filename = safe_filename(&request.filename)?;
    let directory = root.join("projects").join(project_id);
    fs::create_dir_all(&directory).map_err(|error| {
        DeckforgeProjectFolderError::new(
            "create_project_folder_failed",
            format!("failed to create project folder: {error}"),
        )
    })?;
    let file_path = directory.join(filename);
    fs::write(&file_path, &request.content).map_err(|error| {
        DeckforgeProjectFolderError::new(
            "write_project_folder_failed",
            format!("failed to write project folder export: {error}"),
        )
    })?;

    Ok(evidence(directory, file_path))
}

pub fn reveal_project_folder(path: &Path) -> ProjectFolderResult<()> {
    if !path.is_dir() {
        return Err(DeckforgeProjectFolderError::new(
            "project_folder_missing",
            format!("project folder does not exist: {}", path.display()),
        ));
    }
    let status = Command::new("open").arg(path).status().map_err(|error| {
        DeckforgeProjectFolderError::new(
            "reveal_project_folder_failed",
            format!("failed to open Finder: {error}"),
        )
    })?;
    if status.success() {
        return Ok(());
    }
    Err(DeckforgeProjectFolderError::new(
        "reveal_project_folder_failed",
        format!("Finder open exited with status {status}"),
    ))
}

fn evidence(directory: PathBuf, file_path: PathBuf) -> DeckforgeProjectFolderEvidence {
    DeckforgeProjectFolderEvidence {
        directory_path: directory.display().to_string(),
        file_path: file_path.display().to_string(),
    }
}

fn safe_project_id(value: &str) -> ProjectFolderResult<&str> {
    if value.is_empty() || !value.chars().all(is_safe_identifier_char) {
        return Err(DeckforgeProjectFolderError::new(
            "invalid_project_id",
            "project id may contain only ASCII letters, numbers, underscore, and dash".to_owned(),
        ));
    }
    Ok(value)
}

fn safe_filename(value: &str) -> ProjectFolderResult<&str> {
    if value.is_empty()
        || value.starts_with('.')
        || value.contains("..")
        || !value.chars().all(is_safe_filename_char)
    {
        return Err(DeckforgeProjectFolderError::new(
            "invalid_project_filename",
            "project export filename is not safe".to_owned(),
        ));
    }
    Ok(value)
}

fn is_safe_identifier_char(character: char) -> bool {
    character.is_ascii_alphanumeric() || character == '_' || character == '-'
}

fn is_safe_filename_char(character: char) -> bool {
    is_safe_identifier_char(character) || character == '.'
}

#[cfg(test)]
mod tests {
    use super::{prepare_project_folder_at_root, DeckforgeProjectFolderRequest};
    use std::{env, error::Error, fs};

    #[test]
    fn prepares_project_folder_export_under_root() -> Result<(), Box<dyn Error>> {
        let root = env::temp_dir().join("deckforge_project_folder_test_ok");
        if root.exists() {
            fs::remove_dir_all(&root)?;
        }
        let request = DeckforgeProjectFolderRequest {
            project_id: "project_001".to_owned(),
            filename: "project_001.deckforge-folder.json".to_owned(),
            content: "{\"ok\":true}".to_owned(),
        };

        let evidence = prepare_project_folder_at_root(&root, &request)?;

        assert!(evidence.directory_path.ends_with("projects/project_001"));
        assert!(evidence
            .file_path
            .ends_with("project_001.deckforge-folder.json"));
        assert_eq!(fs::read_to_string(evidence.file_path)?, "{\"ok\":true}");
        fs::remove_dir_all(root)?;
        Ok(())
    }

    #[test]
    fn rejects_path_traversal_project_ids() -> Result<(), Box<dyn Error>> {
        let root = env::temp_dir().join("deckforge_project_folder_test_bad");
        let request = DeckforgeProjectFolderRequest {
            project_id: "../bad".to_owned(),
            filename: "project.deckforge-folder.json".to_owned(),
            content: "{}".to_owned(),
        };

        let result = prepare_project_folder_at_root(&root, &request);

        assert!(result.is_err());
        let Err(error) = result else {
            return Ok(());
        };
        assert_eq!(error.code(), "invalid_project_id");
        Ok(())
    }
}
