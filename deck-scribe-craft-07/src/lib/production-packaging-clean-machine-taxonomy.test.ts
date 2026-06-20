import { describe, expect, test } from "bun:test";
import {
  evaluateProductionPackagingEvidence,
  formatProductionPackagingEvidenceSummary,
  type ProductionPackagingEvidence,
} from "./production-packaging-evidence";

describe("production packaging clean-machine taxonomy", () => {
  test("blocks unsupported runtime clean-machine steps", () => {
    // Given: runtime evidence includes all required steps plus an unsupported step label.
    const evidence = runtimeEvidence({
      ...completeEvidence(),
      cleanMachineSteps: [
        "install_app",
        "codex_login",
        "image_credentials",
        "project_launch",
        "live_interview",
        "fixture_clean_machine_step",
      ],
    });

    // When / Then: unsupported clean-machine labels cannot pass as release evidence.
    const result = evaluateProductionPackagingEvidence(evidence);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_clean_machine_step"]);
    expect(result.issues[0]?.refs).toEqual(["fixture_clean_machine_step"]);
  });

  test("summarizes only valid clean-machine steps", () => {
    // Given: an unsupported step attempts to replace the missing live interview step.
    const evidence = runtimeEvidence({
      ...completeEvidence(),
      cleanMachineSteps: [
        "install_app",
        "codex_login",
        "image_credentials",
        "project_launch",
        "fixture_clean_machine_step",
      ],
    });

    // When / Then: summary coverage does not count unsupported step names.
    const summary = formatProductionPackagingEvidenceSummary(evidence);

    expect(summary.includes("clean-machine steps: 4/5")).toBe(true);
  });
});

function runtimeEvidence(value: object): ProductionPackagingEvidence {
  return JSON.parse(JSON.stringify(value));
}

function completeEvidence(): ProductionPackagingEvidence {
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
