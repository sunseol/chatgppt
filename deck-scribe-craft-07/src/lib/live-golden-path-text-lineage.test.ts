import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import {
  evaluateLiveGoldenPathE2EBundle,
  LIVE_GOLDEN_PATH_E2E_STEPS,
  type LiveGoldenPathE2EBundle,
} from "./live-golden-path-e2e";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live golden path text lineage", () => {
  test("blocks completed text stages without production Codex provider lineage", () => {
    // Given
    const bundle = completeBundle();

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_live_text_artifact"]);
    expect(result.issues[0]?.refs).toEqual([
      "live_interview",
      "live_research",
      "live_deck_plan",
      "live_design_system",
      "live_layout_ir",
    ]);
  });

  test("blocks generic text artifact names from satisfying stage-specific lineage", () => {
    // Given
    const bundle = completeBundle();

    // When
    const result = evaluateLiveGoldenPathE2EBundle({
      ...bundle,
      lineage: [
        textArtifact("live_interview", "turn_interview"),
        textArtifact("live_research", "turn_research"),
        textArtifact("plan", "turn_plan"),
        textArtifact("design", "turn_design"),
        textArtifact("layout", "turn_layout"),
        ...bundle.imageArtifacts,
      ],
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_live_text_artifact"]);
    expect(result.issues[0]?.refs).toEqual([
      "live_deck_plan",
      "live_design_system",
      "live_layout_ir",
    ]);
  });
});

function completeBundle(): LiveGoldenPathE2EBundle {
  const reportContent = "Golden Path passed with image-only lineage.";
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
  const imageArtifacts = [
    ...Array.from({ length: 5 }, (_, index) => liveImage(index + 1)),
    liveImage(6, "live_regenerated_slide_003", ["live_image_3"]),
  ];
  return {
    projectId: "p_live",
    finalExportArtifactId: "live_export_001",
    completedSteps: LIVE_GOLDEN_PATH_E2E_STEPS,
    reportPath: "live_e2e_report.md",
    reportContent,
    reportSignature: {
      signer: "qa.lead@example.com",
      signedAt: "2026-06-20T09:00:00.000Z",
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
      reopenedAt: "2026-06-20T09:10:00.000Z",
      exportArtifactId: "live_export_001",
    },
    sources,
    lineage: imageArtifacts,
    imageArtifacts,
  };
}

function liveImage(
  index: number,
  artifactId = `live_image_${index}`,
  inputArtifactIds = ["live_layout_ir"],
) {
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "gpt-image-2",
    promptVersion: "slide_background@v1",
    durationMs: 1_000,
    inputArtifactIds,
    fixture: false,
    threadId: "thread_golden_path",
    turnId: `turn_image_${index}`,
  });
}

function textArtifact(artifactId: string, turnId: string) {
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex-cli 0.141.0",
    promptVersion: `${artifactId}@v1`,
    durationMs: 1_000,
    inputArtifactIds: ["approved_live_context"],
    fixture: false,
    turnId,
    threadId: "thread_golden_path",
  });
}
