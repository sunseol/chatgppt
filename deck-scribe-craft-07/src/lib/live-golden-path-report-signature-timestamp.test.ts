import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import {
  evaluateLiveGoldenPathE2EBundle,
  LIVE_GOLDEN_PATH_E2E_STEPS,
} from "./live-golden-path-e2e";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live golden path report signature timestamp", () => {
  test("blocks signed reports whose signedAt evidence is not a timestamp", () => {
    // Given
    const reportContent = "Golden Path passed with signed live report evidence.";

    // When
    const result = evaluateLiveGoldenPathE2EBundle({
      ...bundleFixture(reportContent),
      reportSignature: {
        signer: "release-reviewer",
        signedAt: "after review",
        digest: hashContent(reportContent),
      },
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["unsigned_live_e2e_report"]);
  });
});

function bundleFixture(reportContent: string) {
  const screenshots = LIVE_GOLDEN_PATH_E2E_STEPS.map(
    (step) => `evidence/golden-path/screenshots/${step}.png`,
  );
  const recordingPath = "evidence/golden-path/recordings/live-golden-path.mp4";
  const sources = [
    {
      url: "https://official.example.gov/report",
      role: "official" as const,
      artifactId: "src_001",
    },
    { url: "https://primary.example.org/data", role: "primary" as const, artifactId: "src_002" },
    {
      url: "https://source.example.net/context",
      role: "supporting" as const,
      artifactId: "src_003",
    },
  ];
  const imageArtifacts = Array.from({ length: 5 }, (_, index) =>
    createProviderArtifactProvenance({
      artifactId: `project_001_image_slide_00${index + 1}_v1`,
      executionMode: "production",
      providerKind: "openaiImage",
      authMode: "api_key",
      modelOrRuntime: "gpt-image-2",
      promptVersion: "slide_generation@v1",
      durationMs: 1_000 + index,
      inputArtifactIds: ["layout_001"],
      fixture: false,
      requestId: `img_req_00${index + 1}`,
    }),
  );
  return {
    projectId: "project_001",
    finalExportArtifactId: "export_001",
    completedSteps: LIVE_GOLDEN_PATH_E2E_STEPS,
    reportPath: "evidence/golden-path/live_e2e_report.md",
    reportContent,
    reportSignature: {
      signer: "release-reviewer",
      signedAt: "2026-06-20T10:00:00Z",
      digest: hashContent(reportContent),
    },
    screenshots,
    recordingPath,
    finalValidationBundle: {
      path: "evidence/golden-path/final-validation-bundle.json",
      finalExportArtifactId: "export_001",
      reportDigest: hashContent(reportContent),
      screenshotPaths: screenshots,
      recordingPath,
      sourceArtifactIds: sources.map((source) => source.artifactId),
      imageArtifactIds: imageArtifacts.map((artifact) => artifact.artifactId),
    },
    restartReopen: {
      projectId: "project_001",
      reopenedAt: "2026-06-20T10:05:00Z",
      exportArtifactId: "export_001",
    },
    sources,
    lineage: imageArtifacts,
    imageArtifacts,
  };
}
