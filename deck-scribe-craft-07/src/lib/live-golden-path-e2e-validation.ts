import { hashContent } from "./artifacts";
import { validationBundleIssues } from "./live-golden-path-e2e-evidence";
import { imageArtifactIssues } from "./live-golden-path-image-evidence";
import { hasObservedGoldenPathEvidencePath } from "./live-golden-path-evidence-path";
import { restartIssues } from "./live-golden-path-restart-evidence";
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

const REQUIRED_TEXT_STAGE_LINEAGE = [
  { step: "live_interview", markers: ["interview"] },
  { step: "live_research", markers: ["research"] },
  { step: "live_deck_plan", markers: ["deck_plan"] },
  { step: "live_design_system", markers: ["design_system"] },
  { step: "live_layout_ir", markers: ["layout_ir"] },
] as const satisfies readonly {
  readonly step: LiveGoldenPathE2EStep;
  readonly markers: readonly string[];
}[];

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
    hasObservedGoldenPathEvidencePath(bundle.reportPath, [".md"]) &&
    signature.signer.trim() &&
    signature.signedAt.trim() &&
    Number.isFinite(Date.parse(signature.signedAt.trim())) &&
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
    hasObservedGoldenPathEvidencePath(path, [".png", ".jpg", ".jpeg", ".webp"]),
  );
  const screenshotCountReady = validScreenshots.length;
  const recordingReady = hasObservedGoldenPathEvidencePath(recordingPath, [
    ".mp4",
    ".mov",
    ".webm",
  ]);
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
    ...textLineageIssues(lineage),
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

function textLineageIssues(
  lineage: readonly ProviderArtifactProvenance[],
): readonly LiveGoldenPathE2EIssue[] {
  const liveTextArtifacts = lineage.filter(isProductionCodexTextArtifact);
  const missing = REQUIRED_TEXT_STAGE_LINEAGE.filter(
    (requirement) =>
      !liveTextArtifacts.some((artifact) =>
        textArtifactMatchesStage(artifact, requirement.markers),
      ),
  ).map((requirement) => requirement.step);
  return missing.length === 0
    ? []
    : [
        liveGoldenPathIssue(
          "missing_live_text_artifact",
          "Golden Path text stages require production Codex provider lineage.",
          missing,
        ),
      ];
}

function isProductionCodexTextArtifact(artifact: ProviderArtifactProvenance): boolean {
  return (
    artifact.executionMode === "production" &&
    artifact.providerKind === "codex" &&
    artifact.authMode === "codex_session" &&
    artifact.artifactId.trim() === artifact.artifactId &&
    artifact.artifactId.length > 0 &&
    artifact.modelOrRuntime.trim().length > 0 &&
    artifact.promptVersion.trim().length > 0 &&
    artifact.fixture === false &&
    hasCanonicalIdentity(artifact.turnId) &&
    hasCanonicalIdentity(artifact.threadId)
  );
}

function hasCanonicalIdentity(value: string | undefined): boolean {
  return value !== undefined && value.length > 0 && value === value.trim();
}

function textArtifactMatchesStage(
  artifact: ProviderArtifactProvenance,
  markers: readonly string[],
): boolean {
  const evidence = `${artifact.artifactId} ${artifact.promptVersion}`.toLowerCase();
  return markers.some((marker) => evidence.includes(marker));
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
