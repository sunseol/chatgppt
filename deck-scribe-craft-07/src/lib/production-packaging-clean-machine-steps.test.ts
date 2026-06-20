import { describe, expect, test } from "bun:test";
import {
  evaluateProductionPackagingEvidence,
  formatProductionPackagingEvidenceSummary,
  type ProductionPackagingEvidence,
} from "./production-packaging-evidence";

describe("production packaging clean-machine step evidence", () => {
  test("blocks duplicated clean-machine steps from inflating validation coverage", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeEvidence({
        cleanMachineSteps: [
          "install_app",
          "codex_login",
          "codex_login",
          "image_credentials",
          "project_launch",
          "live_interview",
        ],
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate_clean_machine_step"]);
    expect(result.issues[0]?.refs).toEqual(["codex_login"]);
  });

  test("summarizes distinct clean-machine steps instead of raw repeated events", () => {
    // Given
    const summary = formatProductionPackagingEvidenceSummary(
      completeEvidence({
        cleanMachineSteps: [
          "install_app",
          "codex_login",
          "codex_login",
          "project_launch",
          "live_interview",
        ],
      }),
    );

    // Then
    expect(summary.includes("clean-machine steps: 4/5")).toBe(true);
  });

  test("blocks clean-machine step labels without persisted evidence paths", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeEvidence({
        cleanMachineStepEvidencePaths: {},
      }),
    );

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_clean_machine_step_evidence",
    ]);
    expect(result.issues[0]?.refs).toEqual([
      "install_app",
      "codex_login",
      "image_credentials",
      "project_launch",
      "live_interview",
    ]);
  });

  test("blocks clean-machine step evidence paths that reference another step", () => {
    // Given
    const result = evaluateProductionPackagingEvidence(
      completeEvidence({
        cleanMachineStepEvidencePaths: {
          ...cleanMachineStepEvidencePaths(),
          codex_login: "release-evidence/clean-machine/install-app.json",
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

function completeEvidence(
  patch: Partial<ProductionPackagingEvidence> = {},
): ProductionPackagingEvidence {
  return {
    packagePath: "dist/deckforge-macos-dry-run.tgz",
    packageSha256: "3c15121b7fd11559b98c4ba751ccdac89a9990a669b7612e95b3cdfd94d0edf3",
    nativeMacosBundlePath: "release-artifacts/DeckForge_0.1.0_aarch64.dmg",
    nativeMacosBundleSha256: "ad8b11dee61a15c193fabfc3a7bf85110b116db65098bd2a845c2533a25dae5d",
    nativeMacosReleaseTrust: {
      signature: "developer_id",
      teamIdentifier: "TEAMID1234",
      notarized: true,
      stapled: true,
      gatekeeperAccepted: true,
      releaseTrustEvidencePath: "release-evidence/macos-release-trust.json",
    },
    productionMode: true,
    contentScan: {
      mockResourceHits: [],
      fixtureHits: [],
      secretHits: [],
      testFileHits: [],
      localPathHits: [],
    },
    cleanMachineSteps: [
      "install_app",
      "codex_login",
      "image_credentials",
      "project_launch",
      "live_interview",
    ],
    cleanMachineStepEvidencePaths: cleanMachineStepEvidencePaths(),
    runtimeAbsenceRemediationShown: true,
    runbookPath: "docs/production-clean-machine-runbook.md",
    ...patch,
  };
}

function cleanMachineStepEvidencePaths(): ProductionPackagingEvidence["cleanMachineStepEvidencePaths"] {
  return {
    install_app: "release-evidence/clean-machine/install-app.json",
    codex_login: "release-evidence/clean-machine/codex-login.json",
    image_credentials: "release-evidence/clean-machine/image-credentials.json",
    project_launch: "release-evidence/clean-machine/project-launch.json",
    live_interview: "release-evidence/clean-machine/live-interview.json",
  };
}
