import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import { createProviderArtifactProvenance } from "./provider-provenance";
import {
  LIVE_GOLDEN_PATH_E2E_STEPS,
  evaluateLiveGoldenPathE2EBundle,
  formatLiveGoldenPathE2ESummary,
  type LiveGoldenPathE2EBundle,
} from "./live-golden-path-e2e";

describe("live golden path E2E evidence", () => {
  test("passes a signed production bundle with real sources, images, restart, and export evidence", () => {
    // Given
    const bundle = completeBundle();

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result).toEqual({ kind: "ready" });
  });

  test("summarizes the signed report and validation bundle without leaking secrets", () => {
    // Given
    const bundle = completeBundle({
      reportContent: "Golden Path passed\nOPENAI_API_KEY=sk-live-secret123",
    });

    // When
    const summary = formatLiveGoldenPathE2ESummary(bundle);

    // Then
    expect(summary.includes("DF-241 Live Golden Path E2E")).toBe(true);
    expect(summary.includes("live_e2e_report.md")).toBe(true);
    expect(summary.includes("final-validation-bundle.zip")).toBe(true);
    expect(summary.includes("sk-live-secret123")).toBe(false);
    expect(summary.includes("[redacted]")).toBe(true);
  });

  test("blocks incomplete or contaminated Golden Path evidence", () => {
    // Given
    const bundle = completeBundle({
      completedSteps: LIVE_GOLDEN_PATH_E2E_STEPS.filter((step) => step !== "title_edit"),
      reportSignature: { signer: "", signedAt: "", digest: "" },
      sources: [
        { url: "https://example.com/blog", role: "supporting", artifactId: "src_001" },
        { url: "not-a-url", role: "supporting", artifactId: "src_002" },
      ],
      lineage: [
        createProviderArtifactProvenance({
          artifactId: "mock_plan",
          executionMode: "production",
          providerKind: "mock",
          authMode: "none",
          modelOrRuntime: "fixture",
          promptVersion: "deck_plan@v1",
          durationMs: 10,
          inputArtifactIds: [],
          fixture: true,
        }),
      ],
      imageArtifacts: [],
      restartReopen: { projectId: "p_live", reopenedAt: "", exportArtifactId: "other_export" },
      screenshots: ["screenshots/login.png"],
      recordingPath: "",
      finalValidationBundle: {
        path: "",
        finalExportArtifactId: "",
        reportDigest: "",
        screenshotPaths: [],
        recordingPath: "",
        sourceArtifactIds: [],
        imageArtifactIds: [],
      },
    });

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_e2e_step",
      "unsigned_live_e2e_report",
      "insufficient_step_evidence",
      "missing_validation_bundle",
      "missing_live_text_artifact",
      "mock_lineage_contamination",
      "fixture_lineage_contamination",
      "insufficient_live_sources",
      "missing_primary_source",
      "insufficient_live_image_artifacts",
      "missing_restart_reopen_evidence",
    ]);
  });

  test("blocks mismatched report digests and missing per-step screenshots", () => {
    // Given
    const bundle = completeBundle({
      reportSignature: {
        signer: "qa.lead@example.com",
        signedAt: "2026-06-18T09:00:00.000Z",
        digest: "sha256:not-the-report-content",
      },
      screenshots: LIVE_GOLDEN_PATH_E2E_STEPS.map((step) =>
        step === "export" ? "screenshots/duplicate-title_edit.png" : `screenshots/${step}.png`,
      ),
    });

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "report_digest_mismatch",
      "missing_step_screenshot",
    ]);
    expect(result.issues[1]?.refs).toEqual(["export"]);
  });

  test("blocks validation bundle manifest mismatches", () => {
    // Given
    const bundle = completeBundle({
      finalValidationBundle: {
        path: "final-validation-bundle.zip",
        finalExportArtifactId: "other_export",
        reportDigest: "sha256:other",
        screenshotPaths: LIVE_GOLDEN_PATH_E2E_STEPS.filter((step) => step !== "export").map(
          (step) => `screenshots/${step}.png`,
        ),
        recordingPath: "recordings/other.mp4",
        sourceArtifactIds: ["src_sec"],
        imageArtifactIds: ["live_image_1"],
      },
    });

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "validation_bundle_export_mismatch",
      "validation_bundle_report_digest_mismatch",
      "validation_bundle_missing_screenshot",
      "validation_bundle_missing_recording",
      "validation_bundle_missing_source",
      "validation_bundle_missing_image_artifact",
    ]);
  });

  test("blocks duplicate references inside the final validation bundle manifest", () => {
    const bundle = completeBundle();
    const manifest = bundle.finalValidationBundle;
    const result = evaluateLiveGoldenPathE2EBundle({
      ...bundle,
      finalValidationBundle: {
        ...manifest,
        screenshotPaths: [...manifest.screenshotPaths, manifest.screenshotPaths[0] ?? ""],
        sourceArtifactIds: [...manifest.sourceArtifactIds, "src_sec"],
        imageArtifactIds: [...manifest.imageArtifactIds, "live_image_1"],
      },
    });
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "validation_bundle_duplicate_reference",
    ]);
  });

  test("blocks repeated live image artifact ids from satisfying the five-image requirement", () => {
    // Given
    const repeatedImages = Array.from({ length: 5 }, () => imageArtifact(1, "live_image_1"));
    const bundle = completeBundle({ imageArtifacts: repeatedImages });

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code).join("|")).toBe(
      "validation_bundle_duplicate_reference|duplicate_live_image_artifact|duplicate_live_image_request|insufficient_live_image_artifacts",
    );
  });

  test("blocks repeated source evidence from satisfying the three-source requirement", () => {
    // Given
    const repeatedSources = Array.from({ length: 3 }, () => ({
      url: "https://www.sec.gov/example",
      role: "official" as const,
      artifactId: "src_sec",
    }));
    const bundle = completeBundle({ sources: repeatedSources });

    // When
    const result = evaluateLiveGoldenPathE2EBundle(bundle);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code).join("|")).toBe(
      "validation_bundle_duplicate_reference|duplicate_live_source|insufficient_live_sources",
    );
  });
});

function completeBundle(patch: Partial<LiveGoldenPathE2EBundle> = {}): LiveGoldenPathE2EBundle {
  const reportContent = patch.reportContent ?? "Golden Path passed with zero mock artifacts.";
  const finalExportArtifactId = patch.finalExportArtifactId ?? "live_export_001";
  const lineage = [
    textArtifact("live_interview", "turn_interview"),
    textArtifact("live_research", "turn_research"),
    textArtifact("live_deck_plan", "turn_plan"),
    textArtifact("live_design_system", "turn_design"),
    textArtifact("live_layout_ir", "turn_layout"),
    ...Array.from({ length: 5 }, (_, index) => imageArtifact(index + 1)),
    imageArtifact(6, "live_regenerated_slide_003"),
    textArtifact("final_report", "turn_report"),
  ];
  const screenshots =
    patch.screenshots ?? LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${step}.png`);
  const recordingPath = patch.recordingPath ?? "recordings/live-golden-path.mp4";
  const sources = patch.sources ?? [
    { url: "https://www.sec.gov/example", role: "official", artifactId: "src_sec" },
    { url: "https://www.w3.org/TR/WCAG22/", role: "primary", artifactId: "src_w3c" },
    { url: "https://www.rfc-editor.org/rfc/rfc9110", role: "supporting", artifactId: "src_rfc" },
  ];
  const imageArtifacts =
    patch.imageArtifacts ?? lineage.filter((artifact) => artifact.providerKind === "openaiImage");

  return {
    projectId: "p_live",
    finalExportArtifactId,
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
    finalValidationBundle: patch.finalValidationBundle ?? {
      path: "final-validation-bundle.zip",
      finalExportArtifactId,
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
    lineage,
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
