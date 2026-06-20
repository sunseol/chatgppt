import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const AUTH_SECRET_LIFECYCLE_DOC = new URL(
  "../../docs/live-auth-secret-lifecycle.md",
  import.meta.url,
);

describe("live auth secret lifecycle documentation", () => {
  test("records DF-205 local auth and package secret-scan evidence", () => {
    const authSecretLifecycle = readFileSync(AUTH_SECRET_LIFECYCLE_DOC, "utf8");

    expect(authSecretLifecycle.includes("DF-205")).toBe(true);
    expect(authSecretLifecycle.includes("codex-cli 0.141.0")).toBe(true);
    expect(authSecretLifecycle.includes("Logged in using ChatGPT")).toBe(true);
    expect(authSecretLifecycle.includes("LiveSecretStore")).toBe(true);
    expect(authSecretLifecycle.includes("LiveSecretReference")).toBe(true);
    expect(authSecretLifecycle.includes("unsupported store kind")).toBe(true);
    expect(authSecretLifecycle.includes("URL-encoded, base64")).toBe(true);
    expect(authSecretLifecycle.includes("base64url, or hex key material")).toBe(true);
    expect(authSecretLifecycle.includes("hex-encoded image API key")).toBe(true);
    expect(authSecretLifecycle.includes("live-auth-secret-reference-encoding.test.ts")).toBe(true);
    expect(authSecretLifecycle.includes("LiveSecretReferenceError")).toBe(true);
    expect(authSecretLifecycle.includes("serializeProjectList")).toBe(true);
    expect(authSecretLifecycle.includes("redactSensitiveText")).toBe(true);
    expect(authSecretLifecycle.includes("Bearer/Basic/token Authorization credentials")).toBe(true);
    expect(authSecretLifecycle.includes("Authorization: Basic ...")).toBe(true);
    expect(authSecretLifecycle.includes("Authorization: token ...")).toBe(true);
    expect(authSecretLifecycle.includes('quoted `CODEX_SESSION="..."`')).toBe(true);
    expect(authSecretLifecycle.includes('serialized `"token":"..."`')).toBe(true);
    expect(authSecretLifecycle.includes('"id_token":"..."')).toBe(true);
    expect(authSecretLifecycle.includes('"sessionToken":"..."')).toBe(true);
    expect(authSecretLifecycle.includes('"clientSecret":"..."')).toBe(true);
    expect(authSecretLifecycle.includes("disconnectImageApiKeySecret")).toBe(true);
    expect(authSecretLifecycle.includes("rejects store-kind mismatch before delete")).toBe(true);
    expect(authSecretLifecycle.includes("classifyLiveAuthFailure")).toBe(true);
    expect(authSecretLifecycle.includes("login_expired")).toBe(true);
    expect(authSecretLifecycle.includes("Session expired")).toBe(true);
    expect(authSecretLifecycle.includes("verify your organization")).toBe(true);
    expect(authSecretLifecycle.includes("createLiveAuthLogoutLockState")).toBe(true);
    expect(
      authSecretLifecycle.includes(
        "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7",
      ),
    ).toBe(true);
    expect(authSecretLifecycle.includes("OpenAI/Codex secret-like values: 0 hits")).toBe(true);
    expect(
      authSecretLifecycle.includes("Bundled `auth.json` or `.codex` payload files: 0 hits"),
    ).toBe(true);
    expect(authSecretLifecycle.includes("Fresh login manual QA")).toBe(true);
    expect(authSecretLifecycle.includes("Logout/relogin QA")).toBe(true);
    expect(authSecretLifecycle.includes("OS keychain")).toBe(true);
  });
});
