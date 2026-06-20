import { describe, expect, test } from "bun:test";
import {
  validateLiveGenerationReportLineage,
  type LiveSlideReportLineage,
} from "./live-generation-report-lineage";

describe("live generation report artifact identity", () => {
  test("blocks malformed image artifact ids that only contain the slide token", () => {
    // Given
    const base = liveSlideLineage();

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      expectedSlideCount: 1,
      slides: [
        {
          ...base,
          imageArtifactId: "not_a_real_image_slide_001_evidence",
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["image_artifact_slide_mismatch"]);
  });

  test("blocks reused text and image artifact ids across slide lineage", () => {
    // Given
    const base = liveSlideLineage();

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      expectedSlideCount: 2,
      slides: [
        base,
        {
          ...base,
          slideNumber: 2,
          imageRequestId: "img_req_002",
          compositorHash: hashB(),
          exportedPngHash: hashB(),
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "duplicate_text_turn",
      "duplicate_text_artifact",
      "duplicate_image_artifact",
      "image_artifact_slide_mismatch",
    ]);
  });

  test("blocks reused text turn ids across distinct slide artifacts", () => {
    // Given
    const base = liveSlideLineage();

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      expectedSlideCount: 2,
      slides: [
        base,
        {
          ...base,
          slideNumber: 2,
          sourceIds: ["src_002"],
          textArtifactId: "deck_plan_live_artifact_002",
          imageArtifactId: "project_001_image_slide_002_v1",
          imageRequestId: "img_req_002",
          compositorHash: hashB(),
          exportedPngHash: hashB(),
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["duplicate_text_turn"]);
  });

  test("blocks reused exported PNG hashes across distinct slide artifacts", () => {
    // Given
    const base = liveSlideLineage();

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      expectedSlideCount: 2,
      slides: [
        base,
        {
          ...base,
          slideNumber: 2,
          sourceIds: ["src_002"],
          textArtifactId: "deck_plan_live_artifact_002",
          textTurnId: "turn_plan_002",
          imageArtifactId: "project_001_image_slide_002_v1",
          imageRequestId: "img_req_002",
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["duplicate_export_hash"]);
  });
});

function liveSlideLineage(): LiveSlideReportLineage {
  return {
    slideNumber: 1,
    sourceIds: ["src_001"],
    textArtifactId: "deck_plan_live_artifact_001",
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
  };
}

function hashA(): string {
  return `sha256:${"a".repeat(64)}`;
}

function hashB(): string {
  return `sha256:${"b".repeat(64)}`;
}
