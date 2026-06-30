import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { issueMapTemplate, OPEN_RELEASE_BLOCKERS } from "./issue-map-template.mjs";
import { hashManifestForBundle } from "./preflight.mjs";

export { SPLIT_RELEASE_ISSUES } from "./issue-map-template.mjs";

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
    visualCouncil: visualCouncilTemplate(sourceDmgSha256),
    releaseEvidence: releaseEvidenceTemplate({ ...options, sourceDmgSha256 }),
    issueMap: issueMapTemplate(checkedAt),
  };
  manifests.releaseEvidence.bundleChecksum = hashManifestForBundle(manifests.releaseEvidence);

  const paths = {
    packagedGoldenPath: path.join(outDir, "packaged-golden-path-manifest.json"),
    cleanMachine: path.join(outDir, "clean-machine-manifest.json"),
    powerPointRoundTrip: path.join(outDir, "powerpoint-round-trip-manifest.json"),
    nonDeveloperUat: path.join(outDir, "non-developer-uat-manifest.json"),
    visualCouncil: path.join(outDir, "visual-council-manifest.json"),
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
      { kind: "visual-council", path: paths.visualCouncil },
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

function visualCouncilTemplate(sourceDmgSha256) {
  return {
    schemaVersion: 1,
    sourceDmgSha256,
    targetScore: 98,
    hardGates: [
      { id: "layout_ir_validator", passed: false, evidencePath: "visual-council/layout-ir.json" },
      { id: "web_render_diff", passed: false, evidencePath: "visual-council/web-render-diff.json" },
      {
        id: "pptx_real_render",
        passed: false,
        evidencePath: "visual-council/pptx-real-render.json",
      },
    ],
    reviews: [],
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
    visualCouncil: blockedEvidence("visual-council/verification.json", sourceDmgSha256),
    secretScan: blockedEvidence("evidence-secret-scan/verification.json", sourceDmgSha256),
  };
}

function blockedEvidence(filePath, dmgSha256) {
  return { status: "blocked", path: filePath, dmgSha256 };
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
