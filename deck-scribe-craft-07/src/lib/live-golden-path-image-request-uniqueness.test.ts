import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import {
  LIVE_GOLDEN_PATH_E2E_STEPS,
  evaluateLiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EBundle,
} from "./live-golden-path-e2e";
import { goldenPathTextLineage } from "./live-golden-path-test-fixtures";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live golden path image request uniqueness", () => {
  test("blocks distinct image artifacts that reuse one provider request id", () => {
    // Given
    const imageArtifacts = [
      ...Array.from({ length: 5 }, (_, index) => liveImageArtifact(`live_image_${index + 1}`)),
      liveImageArtifact("live_regenerated_slide_003"),
    ];
    const bundle = completeBundle({ imageArtifacts });

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "duplicate_live_image_request",
    ]);
  });

  test("blocks blank image artifact ids from satisfying the five-image requirement", () => {
    // Given
    const imageArtifacts = [" ", "\t", "  ", "\n", "\r"].map((artifactId, index) =>
      liveImageArtifact(artifactId, `img_req_${index + 1}`),
    );
    const bundle = completeBundle({ imageArtifacts });

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "insufficient_live_image_artifacts",
    ]);
  });
});

function completeBundle(
  patch: Pick<Partial<LiveGoldenPathE2EBundle>, "imageArtifacts"> = {},
): LiveGoldenPathE2EBundle {
  const reportContent = "Golden Path passed with five requested live images.";
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
  const imageArtifacts =
    patch.imageArtifacts ??
    Array.from({ length: 5 }, (_, index) =>
      liveImageArtifact(`live_image_${index + 1}`, `img_req_${index + 1}`),
    );

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
      reopenedAt: "2026-06-19T09:10:00.000Z",
      exportArtifactId: "live_export_001",
    },
    sources,
    lineage: [...goldenPathTextLineage(), ...imageArtifacts],
    imageArtifacts,
  };
}

function liveImageArtifact(artifactId: string, turnId = "turn_image_reused") {
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "gpt-image-2",
    promptVersion: "slide_background@v1",
    durationMs: 1_000,
    inputArtifactIds: ["live_layout_ir"],
    fixture: false,
    threadId: "thread_golden_path",
    turnId,
  });
}
