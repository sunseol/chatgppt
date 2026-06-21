import {
  CLEAN_MACHINE_STEPS,
  type ProductionPackagingEvidence,
} from "./production-packaging-evidence";

export const VALID_RELEASE_TRUST_EVIDENCE_PATH =
  "release-evidence/release-trust/codesign-notarytool-stapler-spctl.json";

export function completeProductionPackagingEvidence(
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
      releaseTrustEvidencePath: VALID_RELEASE_TRUST_EVIDENCE_PATH,
    },
    productionMode: true,
    contentScan: {
      mockResourceHits: [],
      fixtureHits: [],
      secretHits: [],
      testFileHits: [],
      localPathHits: [],
    },
    cleanMachineSteps: CLEAN_MACHINE_STEPS,
    cleanMachineStepEvidencePaths: productionCleanMachineStepEvidencePaths(),
    cleanMachineAccountEvidencePath: "release-evidence/clean-machine/clean-macos-account.json",
    runtimeAbsenceRemediationShown: true,
    runbookPath: "docs/production-clean-machine-runbook.md",
    ...patch,
  };
}

export function productionCleanMachineStepEvidencePaths(): ProductionPackagingEvidence["cleanMachineStepEvidencePaths"] {
  return {
    install_app: "release-evidence/clean-machine/install-app.json",
    codex_login: "release-evidence/clean-machine/codex-login.json",
    image_credentials: "release-evidence/clean-machine/image-credentials.json",
    project_launch: "release-evidence/clean-machine/project-launch.json",
    live_interview: "release-evidence/clean-machine/live-interview.json",
  };
}
