import { hashContent } from "./artifacts";
import { liveImageArtifacts, validationBundleIssues } from "./live-golden-path-e2e-evidence";
import { sourceIssues } from "./live-golden-path-source-evidence";
import {
  LIVE_GOLDEN_PATH_E2E_STEPS,
  liveGoldenPathIssue,
  type LiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EIssue,
  type LiveGoldenPathE2EStep,
} from "./live-golden-path-e2e-contract";
import {
  collectLineageContamination,
  type ProviderArtifactProvenance,
} from "./provider-provenance";
import { redactSensitiveText } from "./redaction";

export function liveGoldenPathIssues(
  bundle: LiveGoldenPathE2EBundle,
): readonly LiveGoldenPathE2EIssue[] {
  return [
    ...stepIssues(bundle.completedSteps),
    ...reportSignatureIssues(bundle),
    ...stepEvidenceIssues(bundle.screenshots, bundle.recordingPath),
    ...validationBundleIssues(bundle),
    ...lineageIssues(bundle.lineage),
    ...sourceIssues(bundle.sources),
    ...imageArtifactIssues(bundle.imageArtifacts),
    ...restartIssues(bundle),
    ...secretIssues(bundle.reportContent),
  ];
}

function stepIssues(
  completedSteps: readonly LiveGoldenPathE2EStep[],
): readonly LiveGoldenPathE2EIssue[] {
  const completed = new Set(completedSteps);
  const missing = LIVE_GOLDEN_PATH_E2E_STEPS.filter((step) => !completed.has(step));
  return missing.length === 0
    ? []
    : [
        liveGoldenPathIssue(
          "missing_e2e_step",
          "Live Golden Path must complete every required step.",
          missing,
        ),
      ];
}

function reportSignatureIssues(bundle: LiveGoldenPathE2EBundle): readonly LiveGoldenPathE2EIssue[] {
  const signature = bundle.reportSignature;
  const signed =
    basename(bundle.reportPath) === "live_e2e_report.md" &&
    signature.signer.trim() &&
    signature.signedAt.trim() &&
    signature.digest.trim();
  return signed
    ? reportDigestIssues(bundle.reportContent, signature.digest)
    : [
        liveGoldenPathIssue("unsigned_live_e2e_report", "Signed live_e2e_report.md is required.", [
          bundle.reportPath || "missing",
        ]),
      ];
}

function reportDigestIssues(
  reportContent: string,
  signatureDigest: string,
): readonly LiveGoldenPathE2EIssue[] {
  const expectedDigest = hashContent(reportContent);
  return signatureDigest === expectedDigest
    ? []
    : [
        liveGoldenPathIssue(
          "report_digest_mismatch",
          "Signed report digest must match report content.",
          [signatureDigest, expectedDigest],
        ),
      ];
}

function stepEvidenceIssues(
  screenshots: readonly string[],
  recordingPath: string,
): readonly LiveGoldenPathE2EIssue[] {
  const screenshotCountReady = screenshots.filter((path) => path.trim()).length;
  const missingSteps =
    screenshotCountReady >= LIVE_GOLDEN_PATH_E2E_STEPS.length
      ? missingStepScreenshots(screenshots)
      : [];
  return [
    ...(screenshotCountReady >= LIVE_GOLDEN_PATH_E2E_STEPS.length && recordingPath.trim()
      ? []
      : [
          liveGoldenPathIssue(
            "insufficient_step_evidence",
            "Step-level screenshots and a recording are required.",
            [String(screenshotCountReady), recordingPath || "missing"],
          ),
        ]),
    ...(missingSteps.length === 0
      ? []
      : [
          liveGoldenPathIssue(
            "missing_step_screenshot",
            "Each Golden Path step requires its own screenshot evidence.",
            missingSteps,
          ),
        ]),
  ];
}

function lineageIssues(
  lineage: readonly ProviderArtifactProvenance[],
): readonly LiveGoldenPathE2EIssue[] {
  const contamination = collectLineageContamination(lineage);
  return [
    ...contamination.mockArtifactIds.map((artifactId) =>
      liveGoldenPathIssue(
        "mock_lineage_contamination",
        "Golden Path cannot include mock artifacts.",
        [artifactId],
      ),
    ),
    ...contamination.fixtureArtifactIds.map((artifactId) =>
      liveGoldenPathIssue(
        "fixture_lineage_contamination",
        "Golden Path cannot include fixture artifacts.",
        [artifactId],
      ),
    ),
  ];
}

function imageArtifactIssues(
  imageArtifacts: readonly ProviderArtifactProvenance[],
): readonly LiveGoldenPathE2EIssue[] {
  const liveImages = liveImageArtifacts(imageArtifacts);
  const artifactIds = liveImages.map((artifact) => artifact.artifactId);
  const distinctArtifactIds = new Set(artifactIds);
  const duplicates = duplicateValues(artifactIds);
  return [
    ...(duplicates.length === 0
      ? []
      : [
          liveGoldenPathIssue(
            "duplicate_live_image_artifact",
            "Live Golden Path image artifacts must be distinct.",
            duplicates,
          ),
        ]),
    ...(distinctArtifactIds.size >= 5
      ? []
      : [
          liveGoldenPathIssue(
            "insufficient_live_image_artifacts",
            "At least five distinct live image artifacts are required.",
            [String(distinctArtifactIds.size)],
          ),
        ]),
  ];
}

function restartIssues(bundle: LiveGoldenPathE2EBundle): readonly LiveGoldenPathE2EIssue[] {
  const restartReady =
    bundle.restartReopen.projectId === bundle.projectId &&
    bundle.restartReopen.reopenedAt.trim() &&
    bundle.restartReopen.exportArtifactId === bundle.finalExportArtifactId;
  return restartReady
    ? []
    : [
        liveGoldenPathIssue(
          "missing_restart_reopen_evidence",
          "Project must reopen after restart with the same final export artifact.",
          [bundle.restartReopen.projectId, bundle.restartReopen.exportArtifactId],
        ),
      ];
}

function secretIssues(reportContent: string): readonly LiveGoldenPathE2EIssue[] {
  return redactSensitiveText(reportContent) === reportContent
    ? []
    : [
        liveGoldenPathIssue(
          "secret_leak",
          "Live E2E report content contains secret-like text.",
          [],
        ),
      ];
}

function basename(path: string): string {
  return path.split("/").at(-1) ?? "";
}

function missingStepScreenshots(screenshots: readonly string[]): readonly string[] {
  const screenshotStems = new Set(
    screenshots.filter((path) => path.trim()).map((path) => stem(basename(path))),
  );
  return LIVE_GOLDEN_PATH_E2E_STEPS.filter((step) => !screenshotStems.has(step));
}

function stem(filename: string): string {
  const extensionIndex = filename.lastIndexOf(".");
  return extensionIndex === -1 ? filename : filename.slice(0, extensionIndex);
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }
  return [...duplicates];
}
