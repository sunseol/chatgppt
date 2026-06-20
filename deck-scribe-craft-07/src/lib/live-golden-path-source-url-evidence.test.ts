import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import {
  LIVE_GOLDEN_PATH_E2E_STEPS,
  evaluateLiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EBundle,
} from "./live-golden-path-e2e";
import { goldenPathTextLineage } from "./live-golden-path-test-fixtures";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live golden path source URL evidence", () => {
  test("blocks placeholder and reserved URLs from satisfying the live source requirement", () => {
    const result = evaluateLiveGoldenPathE2EBundle(
      completeBundle([
        { url: "https://example.com/source", role: "official", artifactId: "src_example" },
        { url: "https://example.org/source", role: "primary", artifactId: "src_example_org" },
        { url: "https://203.0.113.10/source", role: "supporting", artifactId: "src_doc_ip" },
      ]),
    );

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    const codes = result.issues.map((issue) => issue.code);
    expect(codes.includes("insufficient_live_sources")).toBe(true);
    expect(codes.includes("missing_primary_source")).toBe(true);
  });

  test("blocks URL variants of one source from satisfying the three-source requirement", () => {
    const result = evaluateLiveGoldenPathE2EBundle(
      completeBundle([
        {
          url: "https://www.sec.gov/ixviewer/doc/action/",
          role: "official",
          artifactId: "src_sec_a",
        },
        {
          url: "https://www.sec.gov/ixviewer/doc/action#financials",
          role: "primary",
          artifactId: "src_sec_b",
        },
        {
          url: "https://www.sec.gov/ixviewer/doc/action///",
          role: "supporting",
          artifactId: "src_sec_c",
        },
      ]),
    );

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    const codes = result.issues.map((issue) => issue.code);
    expect(codes.includes("duplicate_live_source")).toBe(true);
    expect(codes.includes("insufficient_live_sources")).toBe(true);
  });
});

function completeBundle(sources: LiveGoldenPathE2EBundle["sources"]): LiveGoldenPathE2EBundle {
  const reportContent = "Golden Path passed with URL evidence checked.";
  const screenshots = LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${step}.png`);
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
