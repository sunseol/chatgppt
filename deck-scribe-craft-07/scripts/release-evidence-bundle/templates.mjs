import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashManifestForBundle } from "./preflight.mjs";

export const SPLIT_RELEASE_ISSUES = {
  "DF-REL-001": 169,
  "DF-UI-001": 176,
  "DF-QA-002": 177,
  "DF-QA-003": 178,
  "DF-E2E-112": 170,
  "DF-UI-040": 179,
  "DF-REL-002": 171,
  "DF-PPT-001": 172,
  "DF-UAT-001": 173,
  "DF-SEC-001": 174,
  "DF-REL-003": 175,
};

const PARENT_ISSUE = 168;
const ISSUE_DEPENDENCIES = {
  "DF-REL-001": [],
  "DF-UI-001": [],
  "DF-QA-002": ["DF-UI-001", "DF-REL-001"],
  "DF-QA-003": ["DF-QA-002"],
  "DF-E2E-112": ["DF-REL-001", "DF-UI-001", "DF-QA-002", "DF-QA-003"],
  "DF-UI-040": ["DF-UI-001", "DF-QA-002"],
  "DF-REL-002": ["DF-REL-001"],
  "DF-PPT-001": ["DF-E2E-112"],
  "DF-UAT-001": ["DF-E2E-112", "DF-UI-040"],
  "DF-SEC-001": ["DF-QA-003", "DF-E2E-112", "DF-REL-002", "DF-PPT-001", "DF-UAT-001"],
  "DF-REL-003": [
    "DF-REL-001",
    "DF-UI-001",
    "DF-QA-002",
    "DF-QA-003",
    "DF-E2E-112",
    "DF-UI-040",
    "DF-REL-002",
    "DF-PPT-001",
    "DF-UAT-001",
    "DF-SEC-001",
  ],
};
const OPEN_RELEASE_BLOCKERS = Object.fromEntries(
  Object.keys(SPLIT_RELEASE_ISSUES).map((ticket) => [ticket, "open"]),
);

export async function writeReleaseEvidenceTemplates(options) {
  const outDir = path.resolve(options.outDir);
  const sourceDmgSha256 = options.sourceDmgSha256;
  const productionPackageSha256 = options.productionPackageSha256 ?? "";
  const nativeMacosBundlePath =
    options.nativeMacosBundlePath ?? "release-artifacts/DeckForge_0.1.0_aarch64.dmg";
  const nativeMacosBundleVerified = options.nativeMacosBundleVerified ?? false;
  const runtimeAbsenceRemediationShown = options.runtimeAbsenceRemediationShown ?? false;
  const runtimeAbsenceRemediationEvidencePath = options.runtimeAbsenceRemediationEvidencePath ?? "";
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  await mkdir(outDir, { recursive: true });

  const manifests = {
    packagedGoldenPath: packagedGoldenPathTemplate(sourceDmgSha256),
    cleanMachine: cleanMachineTemplate(sourceDmgSha256, {
      nativeMacosBundlePath,
      nativeMacosBundleVerified,
      productionPackageSha256,
      runtimeAbsenceRemediationShown,
      runtimeAbsenceRemediationEvidencePath,
    }),
    powerPointRoundTrip: powerPointRoundTripTemplate(sourceDmgSha256),
    nonDeveloperUat: nonDeveloperUatTemplate(sourceDmgSha256),
    releaseEvidence: releaseEvidenceTemplate({ ...options, sourceDmgSha256 }),
    issueMap: issueMapTemplate(checkedAt),
  };
  manifests.releaseEvidence.bundleChecksum = hashManifestForBundle(manifests.releaseEvidence);

  const paths = {
    packagedGoldenPath: path.join(outDir, "packaged-golden-path-manifest.json"),
    cleanMachine: path.join(outDir, "clean-machine-manifest.json"),
    powerPointRoundTrip: path.join(outDir, "powerpoint-round-trip-manifest.json"),
    nonDeveloperUat: path.join(outDir, "non-developer-uat-manifest.json"),
    releaseEvidence: path.join(outDir, "release-evidence-manifest.json"),
    issueMap: path.join(outDir, "split-issue-map.json"),
  };
  await Promise.all(
    Object.entries(paths).map(([key, filePath]) => writeJson(filePath, manifests[key])),
  );
  return {
    outDir,
    paths,
    files: [
      { kind: "packaged-golden-path", path: paths.packagedGoldenPath },
      { kind: "clean-machine", path: paths.cleanMachine },
      { kind: "powerpoint-round-trip", path: paths.powerPointRoundTrip },
      { kind: "non-developer-uat", path: paths.nonDeveloperUat },
      { kind: "release-evidence", path: paths.releaseEvidence },
      { kind: "issue-map", path: paths.issueMap },
    ],
  };
}

function packagedGoldenPathTemplate(sourceDmgSha256) {
  return {
    schemaVersion: 1,
    sourceDmgSha256,
    bundle: {
      projectId: "",
      finalExportArtifactId: "",
      completedSteps: [],
      reportPath: "packaged-golden-path/live_e2e_report.md",
      reportContent: "",
      reportSignature: { signer: "", signedAt: "", digest: "" },
      screenshots: [],
      recordingPath: "packaged-golden-path/live-golden-path.mp4",
      finalValidationBundle: {
        path: "packaged-golden-path/final-validation-bundle.zip",
        finalExportArtifactId: "",
        reportDigest: "",
        screenshotPaths: [],
        recordingPath: "packaged-golden-path/live-golden-path.mp4",
        sourceArtifactIds: [],
        imageArtifactIds: [],
      },
      restartReopen: { projectId: "", reopenedAt: "", exportArtifactId: "" },
      sources: [],
      lineage: [],
      imageArtifacts: [],
    },
  };
}

function cleanMachineTemplate(sourceDmgSha256, options) {
  return {
    schemaVersion: 1,
    sourceDmgSha256,
    evidence: {
      packagePath: "dist/deckforge-macos-dry-run.tgz",
      packageSha256: options.productionPackageSha256,
      nativeMacosBundlePath: options.nativeMacosBundlePath,
      nativeMacosBundleSha256: sourceDmgSha256,
      nativeMacosBundleVerified: options.nativeMacosBundleVerified,
      productionMode: true,
      contentScan: {
        mockResourceHits: [],
        fixtureHits: [],
        secretHits: [],
        testFileHits: [],
        localPathHits: [],
      },
      cleanMachineSteps: [],
      runtimeAbsenceRemediationShown: options.runtimeAbsenceRemediationShown,
      runtimeAbsenceRemediationEvidencePath: options.runtimeAbsenceRemediationEvidencePath,
      runbookPath: "docs/production-clean-machine-runbook.md",
    },
  };
}

function powerPointRoundTripTemplate(sourceDmgSha256) {
  return {
    schemaVersion: 1,
    sourceDmgSha256,
    pptxPath: "powerpoint-round-trip/deckforge-before.pptx",
    pptxSha256: "",
    roundTrippedPptxPath: "powerpoint-round-trip/deckforge-after.pptx",
    roundTrippedPptxSha256: "",
    powerPointVersion: "",
    openedAt: "",
    editedAt: "",
    savedAt: "",
    editedSlideId: "",
    editedObjectId: "",
    editDescription: "",
    beforeObjectGraphPath: "powerpoint-round-trip/before-object-graph.json",
    afterObjectGraphPath: "powerpoint-round-trip/after-object-graph.json",
    operator: { type: "human", name: "" },
  };
}

function nonDeveloperUatTemplate(sourceDmgSha256) {
  return {
    schemaVersion: 1,
    sourceDmgSha256,
    sessionArtifactPath: "non-developer-uat/session.json",
    evidence: {
      testerRole: "non_developer",
      sessionDurationMs: 0,
      setupTasks: [],
      approvalTargetChecks: [],
      openedRealSourceUrls: [],
      regeneratedSlideIds: [],
      editedTitleSlideIds: [],
      openedExports: [],
      criticalErrorCount: 0,
      mockIndicatorCount: 0,
      placeholderOutputCount: 0,
      severityIssueListPresent: false,
      issueLog: [],
    },
  };
}

function releaseEvidenceTemplate(options) {
  const sourceDmgSha256 = options.sourceDmgSha256;
  return {
    schemaVersion: 1,
    qaStatus: "local-candidate",
    artifactIdentity: {
      gitCommit: options.gitCommit ?? "",
      dirtyWorktree: true,
      version: options.version ?? "",
      buildNumber: options.buildNumber ?? "",
      dmgPath: options.dmgPath ?? "release-artifacts/DeckForge_0.1.0_aarch64.dmg",
      dmgSha256: sourceDmgSha256,
    },
    bundleChecksum: "",
    evidence: evidenceItems(sourceDmgSha256),
    releaseBlockers: OPEN_RELEASE_BLOCKERS,
    signOff: {
      qa: { name: "", signedAt: "" },
      releaseOwner: { name: "", signedAt: "" },
    },
  };
}

function evidenceItems(sourceDmgSha256) {
  return {
    releaseArtifact: blockedEvidence("release-artifact/verification.json", sourceDmgSha256),
    automation: blockedEvidence("production-ui-e2e/verification.json", sourceDmgSha256),
    uiContract: blockedEvidence("gppt-ui-contract/verification.json", sourceDmgSha256),
    packagedGoldenPath: blockedEvidence("packaged-golden-path/verification.json", sourceDmgSha256),
    section45Interactions: blockedEvidence("section45/verification.json", sourceDmgSha256),
    cleanMachine: blockedEvidence("clean-machine/verification.json", sourceDmgSha256),
    powerPointRoundTrip: blockedEvidence(
      "powerpoint-round-trip/verification.json",
      sourceDmgSha256,
    ),
    nonDeveloperUat: blockedEvidence("non-developer-uat/verification.json", sourceDmgSha256),
    secretScan: blockedEvidence("evidence-secret-scan/verification.json", sourceDmgSha256),
  };
}

function blockedEvidence(filePath, dmgSha256) {
  return { status: "blocked", path: filePath, dmgSha256 };
}

function issueMapTemplate(checkedAt) {
  return {
    schemaVersion: 1,
    parentIssue: PARENT_ISSUE,
    splitIssues: SPLIT_RELEASE_ISSUES,
    dependencies: ISSUE_DEPENDENCIES,
    checkedAt,
  };
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
