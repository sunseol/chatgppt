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
    expect(authSecretLifecycle.includes("URL-encoded key material")).toBe(true);
    expect(authSecretLifecycle.includes("serializeProjectList")).toBe(true);
    expect(authSecretLifecycle.includes("redactSensitiveText")).toBe(true);
    expect(authSecretLifecycle.includes("disconnectImageApiKeySecret")).toBe(true);
    expect(authSecretLifecycle.includes("rejects store-kind mismatch before delete")).toBe(true);
    expect(authSecretLifecycle.includes("classifyLiveAuthFailure")).toBe(true);
    expect(authSecretLifecycle.includes("createLiveAuthLogoutLockState")).toBe(true);
    expect(
      authSecretLifecycle.includes(
        "4d602ff9da53252fb2d256a1a2e1029905d00b2094cb6c4c6555083008edcc76",
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
