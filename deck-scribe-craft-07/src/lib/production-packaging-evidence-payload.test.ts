import { describe, expect, test } from "bun:test";
import { evaluateProductionPackagingEvidence } from "./production-packaging-evidence";
import {
  completeProductionPackagingEvidence,
  productionCleanMachineStepEvidencePaths,
  productionPackagingEvidencePayloads,
} from "./production-packaging-test-fixtures";

describe("production packaging persisted evidence payloads", () => {
  test("blocks release trust evidence when the persisted payload omits assessment records", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeProductionPackagingEvidence({
        evidencePayloads: {
          ...productionPackagingEvidencePayloads(),
          releaseTrust: {
            kind: "macos_release_trust",
            evidencePath: "release-evidence/release-trust/codesign-notarytool-stapler-spctl.json",
            packagePath: "dist/deckforge-macos-release.tgz",
            packageSha256: "3c15121b7fd11559b98c4ba751ccdac89a9990a669b7612e95b3cdfd94d0edf3",
          },
        },
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_release_trust_evidence"]);
  });

  test("blocks clean-machine account evidence whose payload is not clean account proof", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeProductionPackagingEvidence({
        evidencePayloads: {
          ...productionPackagingEvidencePayloads(),
          cleanMachineAccount: {
            kind: "clean_macos_account",
            evidencePath: "release-evidence/clean-machine/clean-macos-account.json",
            accountType: "developer_account",
            macosUsername: "jake",
            homeDirectory: "/Users/jake",
            developerAccount: true,
            capturedAt: "2026-06-21T19:30:00Z",
          },
        },
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_clean_machine_account_evidence",
    ]);
  });

  test("blocks clean-machine step evidence whose payload points at another step", () => {
    // Given
    const stepPaths = productionCleanMachineStepEvidencePaths();
    const result = evaluateProductionPackagingEvidence(
      completeProductionPackagingEvidence({
        evidencePayloads: {
          ...productionPackagingEvidencePayloads(),
          cleanMachineSteps: {
            ...productionPackagingEvidencePayloads().cleanMachineSteps,
            codex_login: {
              kind: "clean_machine_step",
              step: "install_app",
              evidencePath: stepPaths.codex_login,
              accountEvidencePath: "release-evidence/clean-machine/clean-macos-account.json",
              status: "passed",
              capturedAt: "2026-06-21T19:32:00Z",
            },
          },
        },
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_clean_machine_step_evidence",
    ]);
    expect(result.issues[0]?.refs).toEqual(["codex_login"]);
  });
});
