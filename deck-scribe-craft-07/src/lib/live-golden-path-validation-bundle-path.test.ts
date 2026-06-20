import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import {
  evaluateLiveGoldenPathE2EBundle,
  LIVE_GOLDEN_PATH_E2E_STEPS,
} from "./live-golden-path-e2e";
import { goldenPathTextLineage } from "./live-golden-path-test-fixtures";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live golden path validation bundle path", () => {
  test("blocks synthetic final validation bundle paths", () => {
    const reportContent = "Golden Path passed with zero mock artifacts.";
    const result = evaluateLiveGoldenPathE2EBundle({
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
      screenshots: LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${step}.png`),
      recordingPath: "recordings/live-golden-path.mp4",
      finalValidationBundle: {
        path: "fixtures/final-validation-bundle.zip",
        finalExportArtifactId: "live_export_001",
        reportDigest: hashContent(reportContent),
        screenshotPaths: LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${step}.png`),
        recordingPath: "recordings/live-golden-path.mp4",
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
      restartReopen: {
        projectId: "p_live",
        reopenedAt: "2026-06-18T09:10:00.000Z",
        exportArtifactId: "live_export_001",
      },
      sources: [
        { url: "https://www.sec.gov/example", role: "official", artifactId: "src_sec" },
        { url: "https://www.w3.org/TR/WCAG22/", role: "primary", artifactId: "src_w3c" },
        {
          url: "https://www.rfc-editor.org/rfc/rfc9110",
          role: "supporting",
          artifactId: "src_rfc",
        },
      ],
      lineage: goldenPathTextLineage(),
      imageArtifacts: [
        ...[1, 2, 3, 4, 5].map((index) => imageArtifact(index)),
        imageArtifact(6, "live_regenerated_slide_003"),
      ],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_validation_bundle"]);
  });
});

function imageArtifact(index: number, artifactId = `live_image_${index}`) {
  return createProviderArtifactProvenance({
    artifactId,
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
