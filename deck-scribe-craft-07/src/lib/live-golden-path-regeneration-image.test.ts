import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import { createProviderArtifactProvenance } from "./provider-provenance";
import {
  LIVE_GOLDEN_PATH_E2E_STEPS,
  evaluateLiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EBundle,
} from "./live-golden-path-e2e";
import { goldenPathTextLineage } from "./live-golden-path-test-fixtures";

describe("live golden path regenerated image evidence", () => {
  test("blocks bundles that only include the initial five live images", () => {
    const imageArtifacts = Array.from({ length: 5 }, (_, index) => liveImage(index + 1));

    const result = evaluateLiveGoldenPathE2EBundle(bundleWithImages(imageArtifacts));

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(
      result.issues.map((issue) => issue.code).includes("missing_regenerated_live_image_artifact"),
    ).toBe(true);
  });

  test("does not count the regenerated image toward the five initial images", () => {
    const imageArtifacts = [
      ...Array.from({ length: 4 }, (_, index) => liveImage(index + 1)),
      regeneratedImage(),
    ];

    const result = evaluateLiveGoldenPathE2EBundle(bundleWithImages(imageArtifacts));

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(
      result.issues.map((issue) => issue.code).includes("insufficient_live_image_artifacts"),
    ).toBe(true);
  });
});

function bundleWithImages(
  imageArtifacts: LiveGoldenPathE2EBundle["imageArtifacts"],
): LiveGoldenPathE2EBundle {
  const reportContent = "Golden Path passed with five initial images only.";
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
  };
}

function liveImage(index: number) {
  return createProviderArtifactProvenance({
    artifactId: `live_image_${index}`,
    executionMode: "production",
    providerKind: "openaiImage",
    authMode: "api_key",
    modelOrRuntime: "gpt-image-1",
    promptVersion: "slide_background@v1",
    durationMs: 1_000,
    inputArtifactIds: ["live_layout_ir"],
    fixture: false,
    requestId: `img_req_${index}`,
  });
}

function regeneratedImage() {
  return createProviderArtifactProvenance({
    artifactId: "project_001_image_slide_003_v2",
    executionMode: "production",
    providerKind: "openaiImage",
    authMode: "api_key",
    modelOrRuntime: "gpt-image-1",
    promptVersion: "slide_generation@v1",
    durationMs: 1_000,
    inputArtifactIds: ["live_image_3"],
    fixture: false,
    requestId: "img_req_regenerated",
  });
}
