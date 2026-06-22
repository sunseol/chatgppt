import { describe, expect, test } from "bun:test";
import {
  parseDf205PackagedAuthSecretInput,
  produceDf205PackagedAuthSecretEvidence,
} from "./df205-packaged-auth-secret-evidence-producer";

const PACKAGE_SHA = "e6ed0e25791dd51a1c206247bd0faf5a1010aaee6c7b16e7256dfd25f74f47f6";
const CAPTURED_AT = "2026-06-22T07:30:00.000Z";

describe("DF-205 packaged auth secret evidence producer", () => {
  test("produces ready auth secret evidence from clean login logout and secret scan proof", () => {
    // Given
    const input = parseDf205PackagedAuthSecretInput(completeInput());

    // When
    const evidence = produceDf205PackagedAuthSecretEvidence(input);

    // Then
    expect(evidence.evidenceKind).toBe("df205-packaged-auth-secret-evidence");
    expect(evidence.status).toBe("ready");
    expect(evidence.releaseBlockers).toEqual([]);
    expect(evidence.authSessionId).toBe("df205_clean_auth_20260622");
  });

  test("keeps auth secret evidence blocked when logout does not lock provider actions", () => {
    // Given
    const input = parseDf205PackagedAuthSecretInput({
      ...completeInput(),
      logoutRelogin: {
        ...completeInput().logoutRelogin,
        providerActionsLockedWhileLoggedOut: false,
      },
    });

    // When
    const evidence = produceDf205PackagedAuthSecretEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain(
      "DF-205 logout/relogin proof does not lock providers while logged out",
    );
  });

  test("keeps auth secret evidence blocked when package hashes drift", () => {
    // Given
    const input = parseDf205PackagedAuthSecretInput({
      ...completeInput(),
      packageArchiveSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });

    // When
    const evidence = produceDf205PackagedAuthSecretEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain(
      "DF-205 auth session package hash does not match the release package",
    );
  });

  test("rejects malformed auth secret input at the boundary", () => {
    // Given
    const malformedInput = {
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
    };

    // When / Then
    expect(() => parseDf205PackagedAuthSecretInput(malformedInput)).toThrow(
      "Invalid DF-205 packaged auth secret input",
    );
  });
});

function completeInput() {
  return {
    capturedAt: CAPTURED_AT,
    packageArchiveSha256: PACKAGE_SHA,
    authSession: {
      sessionId: "df205_clean_auth_20260622",
      packageArchiveSha256: PACKAGE_SHA,
      accountMode: "clean_macos_account",
      captureKind: "packaged_clean_account",
    },
    freshLogin: {
      evidencePath: "docs/live-evidence/packaged-df205-20260622/fresh-login.json",
      captureKind: "packaged_clean_account",
      codexLoginStatus: "logged_in_using_chatgpt",
      rawTokenPersisted: false,
      authJsonBundled: false,
    },
    logoutRelogin: {
      evidencePath: "docs/live-evidence/packaged-df205-20260622/logout-relogin.json",
      captureKind: "packaged_clean_account",
      logoutObserved: true,
      liveJobsCancelled: true,
      providerActionsLockedWhileLoggedOut: true,
      reloginObserved: true,
      postReloginProviderReady: true,
    },
    codexImageCapability: {
      evidencePath: "docs/live-evidence/packaged-df205-20260622/codex-image-capability.json",
      captureKind: "packaged_clean_account",
      providerKind: "codex",
      authMode: "codex_oauth",
      apiKeyRequired: false,
      imageGenerationAvailable: true,
    },
    keychainLifecycle: {
      captureKind: "packaged_run_no_api_key_fallback",
      fallbackInstalled: false,
    },
    secretLeakScan: {
      evidencePath: "docs/live-evidence/packaged-df205-20260622/secret-leak-scan.json",
      captureKind: "signed_packaged_clean_machine",
      packageArchiveSha256: PACKAGE_SHA,
      configuredSecretHits: [],
      authJsonHits: [],
      bearerTokenHits: [],
      localPathHits: [],
    },
  };
}
