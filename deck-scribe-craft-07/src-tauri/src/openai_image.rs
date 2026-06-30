use crate::redaction::redact_sensitive_text;
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::{
    fmt,
    io::Write,
    process::{Command, Stdio},
    time::Instant,
};

const OPENAI_IMAGE_SERVICE: &str = "deckforge.openai.image";
const OPENAI_IMAGE_STORE_KIND: &str = "os_keychain";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenAiImageSecretSaveRequest {
    pub account: String,
    pub api_key: String,
    pub created_at: u64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenAiImageGenerateRequest {
    pub account: String,
    pub model: String,
    pub prompt: String,
    pub aspect_ratio: String,
    pub quality: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OpenAiImageSecretReference {
    pub store_kind: &'static str,
    pub service: &'static str,
    pub account: String,
    pub secret_id: String,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OpenAiImageGenerateResponse {
    pub image_data_url: String,
    pub request_id: String,
    pub size: String,
    pub quality: String,
    pub latency_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenAiImageError {
    code: &'static str,
    message: String,
}

impl OpenAiImageError {
    fn new(code: &'static str, message: String) -> Self {
        Self { code, message }
    }

    pub fn public(code: &'static str, message: String) -> Self {
        Self::new(code, redact_sensitive_text(&message))
    }
}

impl fmt::Display for OpenAiImageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for OpenAiImageError {}

pub type OpenAiImageResult<T> = Result<T, OpenAiImageError>;

pub trait OpenAiImageSecretStore {
    fn save(&self, account: &str, secret: &str) -> OpenAiImageResult<()>;
    fn load(&self, account: &str) -> OpenAiImageResult<String>;
}

pub trait OpenAiImageTransport {
    fn generate(
        &self,
        authorization: &str,
        payload: &serde_json::Value,
    ) -> OpenAiImageResult<OpenAiImageApiResponse>;
}

#[derive(Debug, Clone, Copy)]
pub struct KeyringOpenAiImageSecretStore;

impl OpenAiImageSecretStore for KeyringOpenAiImageSecretStore {
    fn save(&self, account: &str, secret: &str) -> OpenAiImageResult<()> {
        keyring_entry(account)?
            .set_password(secret)
            .map_err(|error| keyring_error("save_secret_failed", error))
    }

    fn load(&self, account: &str) -> OpenAiImageResult<String> {
        keyring_entry(account)?
            .get_password()
            .map_err(|error| keyring_error("load_secret_failed", error))
    }
}

#[derive(Debug, Clone, Copy)]
pub struct CurlOpenAiImageTransport;

impl OpenAiImageTransport for CurlOpenAiImageTransport {
    fn generate(
        &self,
        authorization: &str,
        payload: &serde_json::Value,
    ) -> OpenAiImageResult<OpenAiImageApiResponse> {
        let mut child = Command::new("curl")
            .args(curl_arguments())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|error| {
                OpenAiImageError::new(
                    "openai_image_transport_failed",
                    format!("failed to start OpenAI image transport: {error}"),
                )
            })?;

        let Some(mut stdin) = child.stdin.take() else {
            return Err(OpenAiImageError::new(
                "openai_image_transport_failed",
                "failed to open OpenAI image transport stdin.".to_owned(),
            ));
        };
        let config = curl_config(authorization, payload)?;
        stdin.write_all(config.as_bytes()).map_err(|error| {
            OpenAiImageError::new(
                "openai_image_transport_failed",
                format!("failed to write OpenAI image transport config: {error}"),
            )
        })?;
        drop(stdin);

        let output = child.wait_with_output().map_err(|error| {
            OpenAiImageError::new(
                "openai_image_transport_failed",
                format!("failed to read OpenAI image transport output: {error}"),
            )
        })?;
        if !output.status.success() {
            return Err(OpenAiImageError::new(
                "openai_image_request_failed",
                compact_curl_failure(output.status.code(), &output.stdout, &output.stderr),
            ));
        }
        parse_curl_response(&output.stdout)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct OpenAiImageApiResponse {
    pub id: Option<String>,
    pub data: Vec<OpenAiImageApiData>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OpenAiImageApiData {
    pub b64_json: Option<String>,
}

pub fn save_openai_image_secret_with_store(
    store: &impl OpenAiImageSecretStore,
    request: OpenAiImageSecretSaveRequest,
) -> OpenAiImageResult<OpenAiImageSecretReference> {
    let account = non_empty("account", &request.account)?;
    let api_key = non_empty("api_key", &request.api_key)?;
    store.save(account, api_key)?;
    Ok(secret_reference(account, request.created_at))
}

pub fn generate_openai_image_with_dependencies(
    store: &impl OpenAiImageSecretStore,
    transport: &impl OpenAiImageTransport,
    request: OpenAiImageGenerateRequest,
) -> OpenAiImageResult<OpenAiImageGenerateResponse> {
    let account = non_empty("account", &request.account)?;
    let api_key = store.load(account)?;
    let authorization = format!("Bearer {api_key}");
    let size = size_for_aspect_ratio(&request.aspect_ratio)?;
    let quality = request.quality.unwrap_or_else(|| "high".to_owned());
    let payload = serde_json::json!({
        "model": non_empty("model", &request.model)?,
        "prompt": non_empty("prompt", &request.prompt)?,
        "size": size,
        "quality": quality
    });
    let started_at = Instant::now();
    let api_response = transport.generate(&authorization, &payload)?;
    let image_data = first_image_data(&api_response)?.to_owned();
    let request_id = api_response.id.ok_or_else(|| {
        OpenAiImageError::new(
            "missing_request_id",
            "OpenAI image response did not include a request id.".to_owned(),
        )
    })?;
    Ok(OpenAiImageGenerateResponse {
        image_data_url: format!("data:image/png;base64,{image_data}"),
        request_id,
        size: size.to_owned(),
        quality,
        latency_ms: started_at.elapsed().as_millis(),
    })
}

pub fn save_openai_image_secret(
    request: OpenAiImageSecretSaveRequest,
) -> OpenAiImageResult<OpenAiImageSecretReference> {
    save_openai_image_secret_with_store(&KeyringOpenAiImageSecretStore, request)
}

pub fn generate_openai_image(
    request: OpenAiImageGenerateRequest,
) -> OpenAiImageResult<OpenAiImageGenerateResponse> {
    generate_openai_image_with_dependencies(
        &KeyringOpenAiImageSecretStore,
        &CurlOpenAiImageTransport,
        request,
    )
}

fn non_empty<'a>(field: &'static str, value: &'a str) -> OpenAiImageResult<&'a str> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(OpenAiImageError::new(
            "invalid_request",
            format!("{field} must be non-empty."),
        ));
    }
    Ok(trimmed)
}

fn secret_reference(account: &str, created_at: u64) -> OpenAiImageSecretReference {
    OpenAiImageSecretReference {
        store_kind: OPENAI_IMAGE_STORE_KIND,
        service: OPENAI_IMAGE_SERVICE,
        account: account.to_owned(),
        secret_id: format!("keychain://{OPENAI_IMAGE_SERVICE}/{account}"),
        created_at,
    }
}

fn size_for_aspect_ratio(aspect_ratio: &str) -> OpenAiImageResult<&'static str> {
    match aspect_ratio {
        "16:9" => Ok("1792x1024"),
        "4:3" => Ok("1536x1024"),
        _ => Err(OpenAiImageError::new(
            "unsupported_aspect_ratio",
            format!("unsupported image aspect ratio: {aspect_ratio}"),
        )),
    }
}

fn first_image_data(response: &OpenAiImageApiResponse) -> OpenAiImageResult<&str> {
    let first = response.data.first().ok_or_else(|| {
        OpenAiImageError::new(
            "missing_image_data",
            "OpenAI image response contained no image data.".to_owned(),
        )
    })?;
    first.b64_json.as_deref().ok_or_else(|| {
        OpenAiImageError::new(
            "missing_image_data",
            "OpenAI image response did not include b64_json image data.".to_owned(),
        )
    })
}

fn keyring_entry(account: &str) -> OpenAiImageResult<Entry> {
    Entry::new(OPENAI_IMAGE_SERVICE, account)
        .map_err(|error| keyring_error("keychain_entry_failed", error))
}

fn keyring_error(code: &'static str, error: keyring::Error) -> OpenAiImageError {
    OpenAiImageError::new(
        code,
        format!("OpenAI image keychain operation failed: {error}"),
    )
}

fn curl_arguments() -> [&'static str; 2] {
    ["--config", "-"]
}

fn curl_config(authorization: &str, payload: &serde_json::Value) -> OpenAiImageResult<String> {
    let body = serde_json::to_string(payload).map_err(|error| {
        OpenAiImageError::new(
            "openai_image_request_invalid",
            format!("failed to encode OpenAI image request: {error}"),
        )
    })?;
    Ok(format!(
        "url = \"https://api.openai.com/v1/images/generations\"\nrequest = \"POST\"\nheader = \"Content-Type: application/json\"\nheader = \"Authorization: {}\"\ndata = \"{}\"\nsilent\nshow-error\nfail-with-body\ninclude\n",
        curl_config_escape(authorization),
        curl_config_escape(&body),
    ))
}

fn parse_curl_response(stdout: &[u8]) -> OpenAiImageResult<OpenAiImageApiResponse> {
    let text = String::from_utf8_lossy(stdout);
    let (headers, body) = split_curl_headers_body(&text).unwrap_or(("", &text));
    let mut response: OpenAiImageApiResponse = serde_json::from_str(body).map_err(|error| {
        OpenAiImageError::new(
            "openai_image_response_invalid",
            format!("failed to parse OpenAI image response: {error}"),
        )
    })?;
    if response.id.is_none() {
        response.id = request_id_from_headers(headers);
    }
    Ok(response)
}

fn split_curl_headers_body(text: &str) -> Option<(&str, &str)> {
    if let Some(index) = text.rfind("\r\n\r\n") {
        return Some((&text[..index], &text[index + 4..]));
    }
    text.rfind("\n\n")
        .map(|index| (&text[..index], &text[index + 2..]))
}

fn request_id_from_headers(headers: &str) -> Option<String> {
    headers.lines().rev().find_map(|line| {
        let (name, value) = line.split_once(':')?;
        if name.trim().eq_ignore_ascii_case("x-request-id") {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_owned());
            }
        }
        None
    })
}

fn curl_config_escape(value: &str) -> String {
    let mut escaped = String::new();
    for character in value.chars() {
        match character {
            '\\' => escaped.push_str("\\\\"),
            '"' => escaped.push_str("\\\""),
            '\n' => escaped.push_str("\\n"),
            '\r' => escaped.push_str("\\r"),
            '\t' => escaped.push_str("\\t"),
            _ => escaped.push(character),
        }
    }
    escaped
}

fn compact_curl_failure(exit_code: Option<i32>, stdout: &[u8], stderr: &[u8]) -> String {
    let stderr_text = redact_sensitive_text(&String::from_utf8_lossy(stderr));
    let stdout_text = redact_sensitive_text(&String::from_utf8_lossy(stdout));
    let stderr_line = stderr_text.lines().next().unwrap_or("no stderr");
    let stdout_line = stdout_text.lines().next().unwrap_or("no response body");
    format!(
        "exit {:?}, stderr: {stderr_line}, body: {stdout_line}",
        exit_code
    )
}

#[cfg(test)]
mod tests {
    use super::{
        generate_openai_image_with_dependencies, save_openai_image_secret_with_store,
        OpenAiImageGenerateRequest, OpenAiImageSecretSaveRequest,
    };

    #[test]
    fn stores_secret_reference_without_returning_api_key() -> Result<(), String> {
        let store = MemorySecretStore::default();
        let request = OpenAiImageSecretSaveRequest {
            account: "default".to_owned(),
            api_key: "sk-live-secret-value".to_owned(),
            created_at: 1_789_900_001,
        };

        let reference = save_openai_image_secret_with_store(&store, request).map_err(to_string)?;

        assert_eq!(
            store.saved_secret(),
            Some("sk-live-secret-value".to_owned())
        );
        assert_eq!(reference.store_kind, "os_keychain");
        assert_eq!(reference.service, "deckforge.openai.image");
        assert_eq!(reference.account, "default");
        assert_eq!(
            reference.secret_id,
            "keychain://deckforge.openai.image/default"
        );
        assert!(!serde_json::to_string(&reference)
            .map_err(to_string)?
            .contains("sk-live-secret-value"));
        Ok(())
    }

    #[test]
    fn sends_openai_image_request_with_secret_outside_serialized_response() -> Result<(), String> {
        let store = MemorySecretStore::with_secret("sk-live-secret-value");
        let transport = RecordingOpenAiTransport::default();
        let request = OpenAiImageGenerateRequest {
            account: "default".to_owned(),
            model: "gpt-image-2".to_owned(),
            prompt: "Generate a clean executive presentation background.".to_owned(),
            aspect_ratio: "16:9".to_owned(),
            quality: Some("high".to_owned()),
        };

        let response = generate_openai_image_with_dependencies(&store, &transport, request)
            .map_err(to_string)?;

        let payload = transport.payload().ok_or("missing payload")?;
        assert_eq!(
            transport.authorization(),
            Some("Bearer sk-live-secret-value".to_owned())
        );
        assert_eq!(payload["model"], "gpt-image-2");
        assert_eq!(
            payload["prompt"],
            "Generate a clean executive presentation background."
        );
        assert_eq!(payload["size"], "1792x1024");
        assert_eq!(payload["quality"], "high");
        assert!(response
            .image_data_url
            .starts_with("data:image/png;base64,"));
        assert_eq!(response.request_id, "img_req_live_001");
        assert!(!serde_json::to_string(&response)
            .map_err(to_string)?
            .contains("sk-live-secret-value"));
        Ok(())
    }

    #[test]
    fn curl_invocation_keeps_secret_and_prompt_out_of_process_arguments() -> Result<(), String> {
        let payload = serde_json::json!({
            "model": "gpt-image-2",
            "prompt": "confidential launch strategy",
            "size": "1792x1024",
            "quality": "high"
        });

        let args = super::curl_arguments();
        let config =
            super::curl_config("Bearer sk-live-secret-value", &payload).map_err(to_string)?;

        assert!(!args.join(" ").contains("sk-live-secret-value"));
        assert!(!args.join(" ").contains("confidential launch strategy"));
        assert!(config.contains("Authorization: Bearer sk-live-secret-value"));
        assert!(config.contains("confidential launch strategy"));
        Ok(())
    }

    #[test]
    fn parses_request_id_from_openai_response_headers() -> Result<(), String> {
        let raw = concat!(
            "HTTP/2 200\r\n",
            "content-type: application/json\r\n",
            "x-request-id: req_header_001\r\n",
            "\r\n",
            "{\"data\":[{\"b64_json\":\"iVBORw0KGgo=\"}]}"
        );

        let response = super::parse_curl_response(raw.as_bytes()).map_err(to_string)?;

        assert_eq!(response.id, Some("req_header_001".to_owned()));
        assert_eq!(response.data[0].b64_json, Some("iVBORw0KGgo=".to_owned()));
        Ok(())
    }

    fn to_string(error: impl std::fmt::Display) -> String {
        error.to_string()
    }

    #[derive(Default)]
    struct MemorySecretStore {
        secret: std::cell::RefCell<Option<String>>,
    }

    impl MemorySecretStore {
        fn with_secret(secret: &str) -> Self {
            Self {
                secret: std::cell::RefCell::new(Some(secret.to_owned())),
            }
        }

        fn saved_secret(&self) -> Option<String> {
            self.secret.borrow().clone()
        }
    }

    impl super::OpenAiImageSecretStore for MemorySecretStore {
        fn save(&self, _account: &str, secret: &str) -> super::OpenAiImageResult<()> {
            self.secret.replace(Some(secret.to_owned()));
            Ok(())
        }

        fn load(&self, _account: &str) -> super::OpenAiImageResult<String> {
            self.secret
                .borrow()
                .clone()
                .ok_or_else(|| super::OpenAiImageError::new("missing_secret", "missing".to_owned()))
        }
    }

    #[derive(Default)]
    struct RecordingOpenAiTransport {
        authorization: std::cell::RefCell<Option<String>>,
        payload: std::cell::RefCell<Option<serde_json::Value>>,
    }

    impl RecordingOpenAiTransport {
        fn authorization(&self) -> Option<String> {
            self.authorization.borrow().clone()
        }

        fn payload(&self) -> Option<serde_json::Value> {
            self.payload.borrow().clone()
        }
    }

    impl super::OpenAiImageTransport for RecordingOpenAiTransport {
        fn generate(
            &self,
            authorization: &str,
            payload: &serde_json::Value,
        ) -> super::OpenAiImageResult<super::OpenAiImageApiResponse> {
            self.authorization.replace(Some(authorization.to_owned()));
            self.payload.replace(Some(payload.clone()));
            Ok(super::OpenAiImageApiResponse {
                id: Some("img_req_live_001".to_owned()),
                data: vec![super::OpenAiImageApiData {
                    b64_json: Some("iVBORw0KGgo=".to_owned()),
                }],
            })
        }
    }
}
