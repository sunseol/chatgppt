import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { produceDf205PackagedAuthSecretEvidence } from "./df205-packaged-auth-secret-evidence-producer";
import {
  buildDf205PackagedAuthSecretInputFromCurrentEvidence,
  parseDf205AuthBootstrapSmokeJson,
  parseDf245CurrentPackageRecheckJson,
} from "./df205-current-release-auth-secret-ingestion";

const AUTH_BOOTSTRAP_SMOKE_PATH = "docs/live-evidence/lane-e-20260621/auth-bootstrap-smoke.json";
const PACKAGE_RECHECK_PATH = "docs/live-evidence/release/df245-package-recheck-20260622.json";
const CANDIDATE_PATH =
  "docs/live-evidence/release/df205-packaged-auth-secret-candidate-20260622.json";

describe("DF-205 current release auth secret ingestion", () => {
  test("turns the current auth smoke and package recheck into an honestly blocked candidate", () => {
    // Given
    const authBootstrapSmoke = parseDf205AuthBootstrapSmokeJson(
      readFileSync(AUTH_BOOTSTRAP_SMOKE_PATH, "utf8"),
    );
    const packageRecheck = parseDf245CurrentPackageRecheckJson(
      readFileSync(PACKAGE_RECHECK_PATH, "utf8"),
    );

    // When
    const input = buildDf205PackagedAuthSecretInputFromCurrentEvidence({
      authBootstrapSmoke,
      packageRecheck,
    });
    const evidence = produceDf205PackagedAuthSecretEvidence(input);

    // Then
    expect(input.packageArchiveSha256).toBe(packageRecheck.packageArchive.sha256);
    expect(evidence.status).toBe("blocked");
    expect(evidence.keychainFallbackInstalled).toBeNull();
    expect(evidence.releaseBlockers).toContain(
      "DF-205 auth session was not captured from a packaged clean-account login run",
    );
    expect(evidence.releaseBlockers).toContain(
      "DF-205 fresh login evidence was not captured from a packaged clean-account run",
    );
    expect(evidence.releaseBlockers).toContain(
      "DF-205 logout/relogin evidence was not captured from a packaged clean-account run",
    );
    expect(evidence.releaseBlockers).toContain(
      "DF-205 packaged Codex OAuth image capability was not captured from a packaged clean-account run",
    );
    expect(evidence.releaseBlockers).toContain(
      "DF-205 keychain fallback lifecycle was not recorded for the packaged run",
    );
    expect(evidence.releaseBlockers).toContain(
      "DF-205 packaged secret leak scan was not captured from a clean-machine signed package run",
    );
  });

  test("matches the checked-in blocked candidate artifact", () => {
    // Given
    const authBootstrapSmoke = parseDf205AuthBootstrapSmokeJson(
      readFileSync(AUTH_BOOTSTRAP_SMOKE_PATH, "utf8"),
    );
    const packageRecheck = parseDf245CurrentPackageRecheckJson(
      readFileSync(PACKAGE_RECHECK_PATH, "utf8"),
    );

    // When
    const input = buildDf205PackagedAuthSecretInputFromCurrentEvidence({
      authBootstrapSmoke,
      packageRecheck,
    });
    const evidence = produceDf205PackagedAuthSecretEvidence(input);
    const candidate = JSON.parse(readFileSync(CANDIDATE_PATH, "utf8"));

    // Then
    expect(candidate).toEqual(evidence);
  });
});
