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
    expect(section.includes("prompt deck_plan@v1")).toBe(true);
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

  test("blocks blank source, turn, thread, and image request evidence", () => {
    // Given
    const [base] = completeLineage();
    if (!base) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [
        {
          ...base,
          sourceIds: [" "],
          textTurnId: " ",
          textThreadId: " ",
          imageRequestId: " ",
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "missing_source_trace",
      "missing_text_turn",
      "missing_image_request",
    ]);
  });

  test("blocks mixed blank source ids in slide lineage", () => {
    // Given
    const [base] = completeLineage();
    if (!base) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [{ ...base, sourceIds: ["src_001", "  "] }],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["missing_source_trace"]);
  });

  test("blocks duplicate source ids in slide lineage", () => {
    // Given
    const [base] = completeLineage();
    if (!base) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [{ ...base, sourceIds: ["src_001", " src_001 "] }],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["missing_source_trace"]);
  });

  test("blocks missing text prompt version evidence", () => {
    // Given
    const [base] = completeLineage();
    if (!base) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [{ ...base, textPromptVersion: " " }],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["missing_text_prompt_version"]);
  });

  test("blocks image artifacts that point at a different slide", () => {
    // Given
    const [base] = completeLineage();
    if (!base) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [
        {
          ...base,
          slideNumber: 2,
          imageArtifactId: "project_001_image_slide_001_v1",
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["image_artifact_slide_mismatch"]);
  });

  test("blocks mock or fixture markers inside exported project content", () => {
    // Given
    const [base] = completeLineage();
    if (!base) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [
        {
          ...base,
          projectFileContent: '{"banner":"MOCK MODE","assetPath":"fixtures/report.json"}',
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "mock_lineage_contamination",
      "fixture_lineage_contamination",
    ]);
  });

  test("blocks secret-like text inside sidecar lineage fields", () => {
    // Given
    const [base] = completeLineage();
    if (!base) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [
        {
          ...base,
          sourceIds: ["src_001", "OPENAI_API_KEY=sk-live-secret123"],
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["secret_leak"]);
  });

  test("blocks duplicate slide rows and reused image request evidence", () => {
    // Given
    const [base] = completeLineage();
    if (!base) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      expectedSlideCount: 2,
      slides: [
        base,
        {
          ...base,
          textArtifactId: "plan_live_001_retry",
          textTurnId: "turn_plan_001_retry",
          imageArtifactId: "project_001_image_slide_001_v2",
          imageRequestId: "img_req_002",
          compositorHash: hashB(),
          exportedPngHash: hashB(),
        },
        {
          ...base,
          slideNumber: 2,
          textArtifactId: "plan_live_002",
          textTurnId: "turn_plan_002",
          imageArtifactId: "project_001_image_slide_002_v1",
          compositorHash: hashC(),
          exportedPngHash: hashC(),
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "duplicate_slide_lineage",
      "duplicate_image_request",
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
      textPromptVersion: "deck_plan@v1",
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

function hashC(): string {
  return `sha256:${"c".repeat(64)}`;
}
