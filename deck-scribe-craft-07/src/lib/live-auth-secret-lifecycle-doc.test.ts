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
    expect(authSecretLifecycle.includes("classifyLiveAuthFailure")).toBe(true);
    expect(authSecretLifecycle.includes("createLiveAuthLogoutLockState")).toBe(true);
    expect(
      authSecretLifecycle.includes(
        "377df1eabfc41128c08d24f6c00a40b2f80dac01ccd7f4fc90e810f16924d20e",
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
