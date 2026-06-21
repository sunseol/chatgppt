import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import {
  LIVE_GOLDEN_PATH_E2E_STEPS,
  evaluateLiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EBundle,
} from "./live-golden-path-e2e";
import { goldenPathTextLineage } from "./live-golden-path-test-fixtures";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live golden path template evidence", () => {
  test("blocks observer template report, screenshot, recording, and bundle paths", () => {
    // Given
    const reportContent = "Golden Path passed with five live images.";
    const screenshots = LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/sample/${step}.png`);
    const recordingPath = "recordings/example/live-golden-path.mp4";
    const bundle = completeBundle({
      reportPath: "reports/template/live_e2e_report.md",
      reportContent,
      reportSignature: {
        signer: "qa.lead@example.com",
        signedAt: "2026-06-19T09:00:00.000Z",
        digest: hashContent(reportContent),
      },
      screenshots,
      recordingPath,
      finalValidationBundle: {
        path: "validation/placeholder/final-validation-bundle.zip",
        finalExportArtifactId: "live_export_001",
        reportDigest: hashContent(reportContent),
        screenshotPaths: screenshots,
        recordingPath,
        sourceArtifactIds: ["src_sec", "src_w3c", "src_rfc"],
        imageArtifactIds: [
          "live_image_1",
          "live_image_2",
          "live_image_3",
          "live_image_4",
          "live_image_5",
          "live_regenerated_slide_003",
        ],
      },
    });

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "unsigned_live_e2e_report",
      "insufficient_step_evidence",
      "missing_validation_bundle",
    ]);
  });
});

function completeBundle(patch: Partial<LiveGoldenPathE2EBundle>): LiveGoldenPathE2EBundle {
  const reportContent = patch.reportContent ?? "Golden Path passed.";
  const screenshots =
    patch.screenshots ?? LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${step}.png`);
  const sources = [
    { url: "https://www.sec.gov/example", role: "official" as const, artifactId: "src_sec" },
    { url: "https://www.w3.org/TR/WCAG22/", role: "primary" as const, artifactId: "src_w3c" },
    {
      url: "https://www.rfc-editor.org/rfc/rfc9110",
      role: "supporting" as const,
      artifactId: "src_rfc",
    },
  ];
  const imageArtifacts = [
    ...Array.from({ length: 5 }, (_, index) => imageArtifact(index + 1)),
    imageArtifact(6, "live_regenerated_slide_003"),
  ];
  return {
    projectId: "p_live",
    finalExportArtifactId: "live_export_001",
    completedSteps: LIVE_GOLDEN_PATH_E2E_STEPS,
    reportPath: "live_e2e_report.md",
    reportContent,
    reportSignature: {
      signer: "qa.lead@example.com",
      signedAt: "2026-06-19T09:00:00.000Z",
      digest: hashContent(reportContent),
    },
    screenshots,
    recordingPath: patch.recordingPath ?? "recordings/live-golden-path.mp4",
    finalValidationBundle: {
      path: "final-validation-bundle.zip",
      finalExportArtifactId: "live_export_001",
      reportDigest: hashContent(reportContent),
      screenshotPaths: screenshots,
      recordingPath: patch.recordingPath ?? "recordings/live-golden-path.mp4",
      sourceArtifactIds: sources.map((source) => source.artifactId),
      imageArtifactIds: imageArtifacts.map((artifact) => artifact.artifactId),
    },
    restartReopen: {
      projectId: "p_live",
      reopenedAt: "2026-06-19T09:10:00.000Z",
      exportArtifactId: "live_export_001",
    },
    sources,
    lineage: [...goldenPathTextLineage(), ...imageArtifacts],
    imageArtifacts,
    ...patch,
  };
}

function imageArtifact(index: number, artifactId = `live_image_${index}`) {
  const isRegenerated = artifactId.includes("regenerated");
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "gpt-image-2",
    promptVersion: isRegenerated ? "slide_regeneration@v1" : "slide_background@v1",
    durationMs: 1_000,
    inputArtifactIds: isRegenerated ? ["live_image_3"] : ["live_layout_ir"],
    fixture: false,
    threadId: "thread_golden_path",
    turnId: `turn_image_${index}`,
  });
}
