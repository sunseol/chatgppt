import { describe, expect, test } from "bun:test";
import {
  formatLiveGenerationReportLineage,
  validateLiveGenerationReportLineage,
  type LiveSlideReportLineage,
} from "./live-generation-report-lineage";

describe("live generation report lineage", () => {
  test("formats slide-level source, text turn, image request, and prompt lineage", () => {
    // Given
    const lineage = completeLineage();

    // When
    const section = formatLiveGenerationReportLineage(lineage);

    // Then
    expect(section.includes("## Live Slide Lineage")).toBe(true);
    expect(section.includes("slide 1")).toBe(true);
    expect(section.includes("sources src_001, src_002")).toBe(true);
    expect(section.includes("text turn turn_plan_001")).toBe(true);
    expect(section.includes("image request img_req_001")).toBe(true);
    expect(section.includes("prompt slide_generation@v1")).toBe(true);
    expect(section.includes("fixture no")).toBe(true);
  });

  test("passes complete production lineage with compositor-matched exports", () => {
    // Given
    const lineage = completeLineage();

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: lineage,
    });

    // Then
    expect(validation).toEqual({ kind: "ready" });
  });

  test("allows non-source-backed slides to omit source ids", () => {
    // Given
    const [base] = completeLineage();
    if (!base) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [{ ...base, sourceIds: [], requiresSourceTrace: false }],
    });

    // Then
    expect(validation).toEqual({ kind: "ready" });
  });

  test("blocks contaminated lineage, mismatched export, and leaked secrets", () => {
    // Given
    const [base] = completeLineage();
    if (!base) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [
        {
          ...base,
          textProviderKind: "mock",
          fixture: true,
          exportedPngHash: hashB(),
          projectFileContent: "OPENAI_API_KEY=sk-live-secret123",
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "mock_lineage_contamination",
      "fixture_lineage_contamination",
      "export_compositor_mismatch",
      "secret_leak",
    ]);
  });

  test("blocks missing artifact ids and non-digest export hashes", () => {
    // Given
    const [base] = completeLineage();
    if (!base) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [
        {
          ...base,
          textArtifactId: "",
          imageArtifactId: " ",
          compositorHash: "sha256:not-a-digest",
          exportedPngHash: "sha256:not-a-digest",
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "missing_text_artifact",
      "missing_image_artifact",
      "invalid_compositor_hash",
      "invalid_export_hash",
    ]);
  });
});

function completeLineage(): readonly LiveSlideReportLineage[] {
  return [
    {
      slideNumber: 1,
      sourceIds: ["src_001", "src_002"],
      textArtifactId: "plan_live_001",
      textProviderKind: "codex",
      textTurnId: "turn_plan_001",
      textThreadId: "thread_project_001",
      imageArtifactId: "project_001_image_slide_001_v1",
      imageProviderKind: "openaiImage",
      imageRequestId: "img_req_001",
      promptVersion: "slide_generation@v1",
      fixture: false,
      compositorHash: hashA(),
      exportedPngHash: hashA(),
      projectFileContent: '{"project":"project_001"}',
    },
  ];
}

function hashA(): string {
  return `sha256:${"a".repeat(64)}`;
}

function hashB(): string {
  return `sha256:${"b".repeat(64)}`;
}
