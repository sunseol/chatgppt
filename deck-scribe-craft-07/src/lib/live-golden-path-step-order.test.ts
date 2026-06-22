import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import {
  evaluateLiveGoldenPathE2EBundle,
  LIVE_GOLDEN_PATH_E2E_STEPS,
  type LiveGoldenPathE2EBundle,
} from "./live-golden-path-e2e";
import { goldenPathTextLineage } from "./live-golden-path-test-fixtures";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live golden path step order", () => {
  test("blocks Golden Path evidence whose completed steps are out of order", () => {
    // Given
    const bundle = completeBundle({
      completedSteps: [
        "login",
        "live_research",
        "live_interview",
        "live_deck_plan",
        "live_design_system",
        "live_layout_ir",
        "live_image_generation",
        "live_slide_regeneration",
        "title_edit",
        "export",
      ],
    });

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["e2e_step_order_mismatch"]);
  });
});

function completeBundle(patch: Partial<LiveGoldenPathE2EBundle> = {}): LiveGoldenPathE2EBundle {
  const reportContent = "Golden Path passed with ordered production steps.";
  const imageArtifacts = [
    ...Array.from({ length: 5 }, (_, index) => imageArtifact(index + 1)),
    imageArtifact(6, "live_regenerated_slide_003"),
  ];
  const screenshots = LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${step}.png`);
  const sources = [
    { url: "https://www.sec.gov/example", role: "official" as const, artifactId: "src_sec" },
    { url: "https://www.w3.org/TR/WCAG22/", role: "primary" as const, artifactId: "src_w3c" },
    {
      url: "https://www.rfc-editor.org/rfc/rfc9110",
      role: "supporting" as const,
      artifactId: "src_rfc",
    },
  ];
  return {
    projectId: "p_live",
    finalExportArtifactId: "live_export_001",
    completedSteps: LIVE_GOLDEN_PATH_E2E_STEPS,
    reportPath: "live_e2e_report.md",
    reportContent,
    reportSignature: {
      signer: "qa.lead@example.com",
      signedAt: "2026-06-18T09:00:00.000Z",
      digest: hashContent(reportContent),
    },
    screenshots,
    recordingPath: "recordings/live-golden-path.mp4",
    finalValidationBundle: {
      path: "final-validation-bundle.zip",
      finalExportArtifactId: "live_export_001",
      reportDigest: hashContent(reportContent),
      screenshotPaths: screenshots,
      recordingPath: "recordings/live-golden-path.mp4",
      sourceArtifactIds: sources.map((source) => source.artifactId),
      imageArtifactIds: imageArtifacts.map((artifact) => artifact.artifactId),
    },
    restartReopen: {
      projectId: "p_live",
      reopenedAt: "2026-06-18T09:10:00.000Z",
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
