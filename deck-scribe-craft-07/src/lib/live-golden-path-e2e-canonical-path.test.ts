import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import {
  evaluateLiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EBundle,
} from "./live-golden-path-e2e";
import { LIVE_GOLDEN_PATH_E2E_STEPS } from "./live-golden-path-e2e-contract";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live golden path E2E canonical evidence paths", () => {
  test("blocks boundary-whitespace final validation bundle paths", () => {
    // Given
    const bundle = completeBundle();

    // When
    const result = evaluateLiveGoldenPathE2EBundle({
      ...bundle,
      finalValidationBundle: {
        ...bundle.finalValidationBundle,
        path: " final-validation-bundle.zip ",
      },
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_validation_bundle"]);
  });

  test("blocks boundary-whitespace Golden Path recording paths", () => {
    // Given
    const bundle = completeBundle({ recordingPath: " recordings/live-golden-path.mp4 " });

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["insufficient_step_evidence"]);
  });
});

function completeBundle(patch: Partial<LiveGoldenPathE2EBundle> = {}): LiveGoldenPathE2EBundle {
  const reportContent = "Golden Path passed with zero mock artifacts.";
  const sources = [
    { url: "https://www.sec.gov/example", role: "official", artifactId: "src_sec" },
    { url: "https://www.w3.org/TR/WCAG22/", role: "primary", artifactId: "src_w3c" },
    { url: "https://www.rfc-editor.org/rfc/rfc9110", role: "supporting", artifactId: "src_rfc" },
  ] as const;
  const screenshots = LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${step}.png`);
  const initialImages = Array.from({ length: 5 }, (_, index) => imageArtifact(index + 1));
  const imageArtifacts = [...initialImages, regeneratedImageArtifact()];
  const recordingPath = patch.recordingPath ?? "recordings/live-golden-path.mp4";
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
    recordingPath,
    finalValidationBundle: {
      path: "final-validation-bundle.zip",
      finalExportArtifactId: "live_export_001",
      reportDigest: hashContent(reportContent),
      screenshotPaths: screenshots,
      recordingPath,
      sourceArtifactIds: sources.map((source) => source.artifactId),
      imageArtifactIds: imageArtifacts.map((artifact) => artifact.artifactId),
    },
    restartReopen: {
      projectId: "p_live",
      reopenedAt: "2026-06-18T09:10:00.000Z",
      exportArtifactId: "live_export_001",
    },
    sources,
    lineage: [
      textArtifact("live_interview", "turn_interview"),
      textArtifact("live_research", "turn_research"),
      textArtifact("live_deck_plan", "turn_plan"),
      textArtifact("live_design_system", "turn_design"),
      textArtifact("live_layout_ir", "turn_layout"),
      ...imageArtifacts,
    ],
    imageArtifacts,
    ...patch,
  };
}

function textArtifact(artifactId: string, turnId: string) {
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex-cli 0.139.0",
    promptVersion: `${artifactId}@v1`,
    durationMs: 500,
    inputArtifactIds: [],
    fixture: false,
    turnId,
    threadId: "thread_live_project",
  });
}

function imageArtifact(index: number) {
  return createProviderArtifactProvenance({
    artifactId: `live_image_${index}`,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "gpt-image-2",
    promptVersion: "slide_background@v1",
    durationMs: 1_000,
    inputArtifactIds: ["live_layout_ir"],
    fixture: false,
    threadId: "thread_live_project",
    turnId: `turn_image_${index}`,
  });
}

function regeneratedImageArtifact() {
  return createProviderArtifactProvenance({
    artifactId: "live_regenerated_slide_003",
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "gpt-image-2",
    promptVersion: "slide_regeneration@v1",
    durationMs: 1_000,
    inputArtifactIds: ["live_image_3"],
    fixture: false,
    threadId: "thread_live_project",
    turnId: "turn_image_regenerated",
  });
}
