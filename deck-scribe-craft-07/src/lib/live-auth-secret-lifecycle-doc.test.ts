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
        "39274abf4bf0a164fd837ddaba8ea7fe2cb063550e523328c324f6e62eaa5adb",
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
