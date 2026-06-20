import { describe, expect, test } from "bun:test";
import { redactSensitiveText } from "./redaction";

describe("redaction", () => {
  test("redacts API keys and bearer tokens from text", () => {
    const text = "OPENAI_API_KEY=sk-live-secret123 Authorization: Bearer codex.session.secret";

    const redacted = redactSensitiveText(text);

    expect(redacted).toBe("OPENAI_API_KEY=[redacted] Authorization: Bearer [redacted]");
  });

  test("redacts generic secret assignments", () => {
    const text = "token=abc123def456 password=hunter2 api_key=key_secret";

    const redacted = redactSensitiveText(text);

    expect(redacted).toBe("token=[redacted] password=[redacted] api_key=[redacted]");
  });

  test("redacts quoted secret assignments and serialized secret fields", () => {
    const text =
      'CODEX_SESSION="codex.session.secret" {"token":"abc123def456","password":"hunter2"}';

    const redacted = redactSensitiveText(text);

    expect(redacted).toBe(
      'CODEX_SESSION="[redacted]" {"token":"[redacted]","password":"[redacted]"}',
    );
  });

  test("redacts access and refresh token field variants", () => {
    const text =
      'access_token="codex.access.secret" refreshToken=codex.refresh.secret {"accessToken":"abc123def456","refresh_token":"def456ghi789"}';

    const redacted = redactSensitiveText(text);

    expect(redacted).toBe(
      'access_token="[redacted]" refreshToken=[redacted] {"accessToken":"[redacted]","refresh_token":"[redacted]"}',
    );
  });

  test("redacts OAuth identity and session token field variants", () => {
    const text =
      'id_token=codex.id.secret sessionToken=codex.session.secret {"clientSecret":"abc123def456","session_token":"def456ghi789"}';

    const redacted = redactSensitiveText(text);

    expect(redacted).toBe(
      'id_token=[redacted] sessionToken=[redacted] {"clientSecret":"[redacted]","session_token":"[redacted]"}',
    );
  });

  test("redacts Codex auth file paths", () => {
    const text =
      "Codex auth path /Users/jake/.codex/auth.json and ~/.codex/auth.json must stay private.";

    const redacted = redactSensitiveText(text);

    expect(redacted.includes("/Users/jake/.codex/auth.json")).toBe(false);
    expect(redacted.includes("~/.codex/auth.json")).toBe(false);
    expect(redacted).toBe("Codex auth path [redacted] and [redacted] must stay private.");
  });
});
