import {
  CLEAN_MACHINE_STEPS,
  type CleanMachineStep,
  type ProductionPackagingEvidence,
} from "./production-packaging-evidence";

type CompleteCleanMachineStepEvidencePaths = {
  readonly [Step in CleanMachineStep]: string;
};

export const VALID_RELEASE_TRUST_EVIDENCE_PATH =
  "release-evidence/release-trust/codesign-notarytool-stapler-spctl.json";

export function completeProductionPackagingEvidence(
  patch: Partial<ProductionPackagingEvidence> = {},
): ProductionPackagingEvidence {
  return {
    packagePath: "dist/deckforge-macos-release.tgz",
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
    evidencePayloads: productionPackagingEvidencePayloads(),
    runtimeAbsenceRemediationShown: true,
    runbookPath: "docs/production-clean-machine-runbook.md",
    ...patch,
  };
}

export function productionCleanMachineStepEvidencePaths(): CompleteCleanMachineStepEvidencePaths {
  return {
    install_app: "release-evidence/clean-machine/install-app.json",
    codex_login: "release-evidence/clean-machine/codex-login.json",
    image_credentials: "release-evidence/clean-machine/image-credentials.json",
    project_launch: "release-evidence/clean-machine/project-launch.json",
    live_interview: "release-evidence/clean-machine/live-interview.json",
  };
}

export function productionPackagingEvidencePayloads() {
  const stepPaths = productionCleanMachineStepEvidencePaths();
  return {
    releaseTrust: {
      kind: "macos_release_trust",
      evidencePath: VALID_RELEASE_TRUST_EVIDENCE_PATH,
      packagePath: "dist/deckforge-macos-release.tgz",
      packageSha256: "3c15121b7fd11559b98c4ba751ccdac89a9990a669b7612e95b3cdfd94d0edf3",
      nativeMacosBundlePath: "release-artifacts/DeckForge_0.1.0_aarch64.dmg",
      nativeMacosBundleSha256: "ad8b11dee61a15c193fabfc3a7bf85110b116db65098bd2a845c2533a25dae5d",
      signature: "developer_id",
      teamIdentifier: "TEAMID1234",
      notarizationStatus: "accepted",
      stapled: true,
      gatekeeperAccepted: true,
      commands: {
        codesign: { status: "passed", exitCode: 0 },
        notarytool: { status: "passed", exitCode: 0 },
        stapler: { status: "passed", exitCode: 0 },
        spctl: { status: "passed", exitCode: 0 },
      },
    },
    cleanMachineAccount: {
      kind: "clean_macos_account",
      evidencePath: "release-evidence/clean-machine/clean-macos-account.json",
      accountType: "clean_macos_account",
      macosUsername: "deckforge-clean",
      homeDirectory: "/Users/deckforge-clean",
      developerAccount: false,
      capturedAt: "2026-06-21T19:30:00Z",
    },
    cleanMachineSteps: {
      install_app: cleanMachineStepPayload("install_app", stepPaths.install_app),
      codex_login: cleanMachineStepPayload("codex_login", stepPaths.codex_login),
      image_credentials: cleanMachineStepPayload("image_credentials", stepPaths.image_credentials),
      project_launch: cleanMachineStepPayload("project_launch", stepPaths.project_launch),
      live_interview: cleanMachineStepPayload("live_interview", stepPaths.live_interview),
    },
  };
}

function cleanMachineStepPayload(step: CleanMachineStep, evidencePath: string) {
  return {
    kind: "clean_machine_step",
    step,
    evidencePath,
    accountEvidencePath: "release-evidence/clean-machine/clean-macos-account.json",
    status: "passed",
    capturedAt: "2026-06-21T19:32:00Z",
  };
}
