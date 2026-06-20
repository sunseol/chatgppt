import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import { createProviderArtifactProvenance } from "./provider-provenance";
import {
  LIVE_GOLDEN_PATH_E2E_STEPS,
  evaluateLiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EBundle,
} from "./live-golden-path-e2e";
import { goldenPathTextLineage } from "./live-golden-path-test-fixtures";

describe("live golden path final validation bundle references", () => {
  test("blocks source and image artifact ids that are not part of validated Golden Path evidence", () => {
    const bundle = completeBundle();

    const result = evaluateLiveGoldenPathE2EBundle({
      ...bundle,
      finalValidationBundle: {
        ...bundle.finalValidationBundle,
        sourceArtifactIds: [...bundle.finalValidationBundle.sourceArtifactIds, "src_unreviewed"],
        imageArtifactIds: [
          ...bundle.finalValidationBundle.imageArtifactIds,
          "fixture_image_from_other_run",
        ],
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "validation_bundle_unexpected_reference",
    ]);
    expect(result.issues[0]?.refs).toEqual([
      "source:src_unreviewed",
      "image:fixture_image_from_other_run",
    ]);
  });
});

function completeBundle(): LiveGoldenPathE2EBundle {
  const reportContent = "Golden Path passed with manifest references checked.";
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

function liveImage(
  index: number,
  artifactId = `live_image_${index}`,
  inputArtifactIds = ["live_layout_ir"],
) {
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "openaiImage",
    authMode: "api_key",
    modelOrRuntime: "gpt-image-1",
    promptVersion: "slide_background@v1",
    durationMs: 1_000,
    inputArtifactIds,
    fixture: false,
    requestId: `img_req_${index}`,
  });
}
