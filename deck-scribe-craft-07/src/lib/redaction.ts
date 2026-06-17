const REDACTED_TEXT = "[redacted]";

const API_KEY_PATTERN = /\bsk-[A-Za-z0-9_-]{8,}\b/g;
const BEARER_TOKEN_PATTERN = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi;
const CODEX_AUTH_PATH_PATTERN =
  /(?:~|\/(?:Users|home)\/[^\s"'<>]+)\/\.codex\/auth\.json|[A-Za-z]:\\Users\\[^\s"'<>]+\\\.codex\\auth\.json/g;
const SECRET_ASSIGNMENT_PATTERN =
  /\b(OPENAI_API_KEY|CODEX_SESSION|api[_-]?key|token|password|secret|session)(\s*[:=]\s*)([^\s"']+)/gi;

export function redactSensitiveText(text: string): string {
  return text
    .replace(API_KEY_PATTERN, REDACTED_TEXT)
    .replace(BEARER_TOKEN_PATTERN, `$1${REDACTED_TEXT}`)
    .replace(CODEX_AUTH_PATH_PATTERN, REDACTED_TEXT)
    .replace(SECRET_ASSIGNMENT_PATTERN, `$1$2${REDACTED_TEXT}`);
}
