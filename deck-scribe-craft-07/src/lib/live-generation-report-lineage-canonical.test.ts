import { describe, expect, test } from "bun:test";
import {
  validateLiveGenerationReportLineage,
  type LiveSlideReportLineage,
} from "./live-generation-report-lineage";

describe("live generation report canonical lineage", () => {
  test("blocks lineage fields that only become valid after trimming", () => {
    // Given
    const [base] = completeLineage();
    if (base === undefined) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [
        {
          ...base,
          sourceIds: [" src_001 "],
          textArtifactId: " plan_live_001 ",
          textTurnId: " turn_plan_001 ",
          textThreadId: " thread_project_001 ",
          textPromptVersion: " deck_plan@v1 ",
          imageRequestId: " img_req_001 ",
          promptVersion: " slide_generation@v1 ",
        },
      ],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "missing_source_trace",
      "missing_text_turn",
      "missing_text_prompt_version",
      "missing_text_artifact",
      "missing_image_request",
      "missing_prompt_version",
    ]);
  });

  test("blocks image artifact ids that only match the slide after trimming", () => {
    // Given
    const [base] = completeLineage();
    if (base === undefined) throw new Error("Expected lineage fixture.");

    // When
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: [{ ...base, imageArtifactId: " project_001_image_slide_001_v1 " }],
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["missing_image_artifact"]);
  });
});

function completeLineage(): readonly LiveSlideReportLineage[] {
  return [
    {
      slideNumber: 1,
      sourceIds: ["src_001"],
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
