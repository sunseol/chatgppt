import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import {
  LIVE_GOLDEN_PATH_E2E_STEPS,
  evaluateLiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EBundle,
} from "./live-golden-path-e2e";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live golden path local path evidence", () => {
  test("blocks developer-local report, screenshot, recording, and bundle paths", () => {
    const reportContent = "Golden Path passed with five live images.";
    const screenshots = LIVE_GOLDEN_PATH_E2E_STEPS.map(
      (step) => `/Users/jake/chatgppt/e2e/screenshots/${step}.png`,
    );
    const recordingPath = "/Users/jake/chatgppt/e2e/recordings/live-golden-path.mp4";
    const bundle = completeBundle({
      reportPath: "/Users/jake/chatgppt/e2e/live_e2e_report.md",
      reportContent,
      reportSignature: {
        signer: "qa.lead@example.com",
        signedAt: "2026-06-19T09:00:00.000Z",
        digest: hashContent(reportContent),
      },
      screenshots,
      recordingPath,
      finalValidationBundle: {
        path: "/Users/jake/chatgppt/e2e/final-validation-bundle.zip",
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
        ],
      },
    });

    const result = evaluateLiveGoldenPathE2EBundle(bundle);

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
  const imageArtifacts = Array.from({ length: 5 }, (_, index) => imageArtifact(index + 1));
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
    lineage: imageArtifacts,
    imageArtifacts,
    ...patch,
  };
}

function imageArtifact(index: number) {
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
