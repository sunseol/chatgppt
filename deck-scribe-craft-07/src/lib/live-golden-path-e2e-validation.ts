import { hashContent } from "./artifacts";
import { hasNonSyntheticEvidencePath } from "./live-evidence-path";
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
  return [
    ...(missing.length === 0
      ? stepOrderIssues(completedSteps)
      : [
          liveGoldenPathIssue(
            "missing_e2e_step",
            "Live Golden Path must complete every required step.",
            missing,
          ),
        ]),
  ];
}

function stepOrderIssues(
  completedSteps: readonly LiveGoldenPathE2EStep[],
): readonly LiveGoldenPathE2EIssue[] {
  const ordered =
    completedSteps.length === LIVE_GOLDEN_PATH_E2E_STEPS.length &&
    completedSteps.every((step, index) => step === LIVE_GOLDEN_PATH_E2E_STEPS[index]);
  return ordered
    ? []
    : [
        liveGoldenPathIssue(
          "e2e_step_order_mismatch",
          "Live Golden Path steps must follow the required production sequence.",
          completedSteps,
        ),
      ];
}

function reportSignatureIssues(bundle: LiveGoldenPathE2EBundle): readonly LiveGoldenPathE2EIssue[] {
  const signature = bundle.reportSignature;
  const signed =
    basename(bundle.reportPath) === "live_e2e_report.md" &&
    hasNonSyntheticEvidencePath(bundle.reportPath, [".md"]) &&
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
  const validScreenshots = screenshots.filter((path) =>
    hasNonSyntheticEvidencePath(path, [".png", ".jpg", ".jpeg", ".webp"]),
  );
  const screenshotCountReady = validScreenshots.length;
  const recordingReady = hasNonSyntheticEvidencePath(recordingPath, [".mp4", ".mov", ".webm"]);
  const missingSteps =
    screenshotCountReady >= LIVE_GOLDEN_PATH_E2E_STEPS.length
      ? missingStepScreenshots(validScreenshots)
      : [];
  return [
    ...(screenshotCountReady >= LIVE_GOLDEN_PATH_E2E_STEPS.length && recordingReady
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
  const duplicateArtifactIds = duplicateValues(artifactIds);
  const duplicateRequestIds = duplicateValues(
    liveImages.map((artifact) => artifact.requestId?.trim() ?? ""),
  );
  return [
    ...(duplicateArtifactIds.length === 0
      ? []
      : [
          liveGoldenPathIssue(
            "duplicate_live_image_artifact",
            "Live Golden Path image artifacts must be distinct.",
            duplicateArtifactIds,
          ),
        ]),
    ...(duplicateRequestIds.length === 0
      ? []
      : [
          liveGoldenPathIssue(
            "duplicate_live_image_request",
            "Live Golden Path image artifacts must come from distinct provider requests.",
            duplicateRequestIds,
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
  const reopenedAt = bundle.restartReopen.reopenedAt.trim();
  const restartReady =
    bundle.restartReopen.projectId === bundle.projectId &&
    reopenedAt.length > 0 &&
    Number.isFinite(Date.parse(reopenedAt)) &&
    bundle.restartReopen.exportArtifactId === bundle.finalExportArtifactId;
  return restartReady
    ? []
    : [
        liveGoldenPathIssue(
          "missing_restart_reopen_evidence",
          "Project must reopen after restart with a timestamp and the same final export artifact.",
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
