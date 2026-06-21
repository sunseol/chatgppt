import { describe, expect, test } from "bun:test";
import {
  formatLiveGenerationReportLineage,
  validateLiveGenerationReportLineage,
} from "./live-generation-report-lineage";

describe("live generation report Codex image turn lineage", () => {
  test("accepts Codex OAuth image turn lineage without a legacy image request id", () => {
    // Given
    const lineage = [
      {
        slideNumber: 1,
        sourceIds: ["src_001"],
        textArtifactId: "deck_plan_live_artifact_001",
        textProviderKind: "codex" as const,
        textTurnId: "turn_plan_001",
        textThreadId: "thread_project_001",
        textPromptVersion: "deck_plan@v1",
        imageArtifactId: "project_001_image_slide_001_v1",
        imageProviderKind: "codex" as const,
        imageTurnId: "turn_image_001",
        promptVersion: "slide_generation@v1",
        fixture: false,
        compositorHash: hashA(),
        exportedPngHash: hashA(),
        projectFileContent: '{"project":"project_001"}',
      },
    ];

    // When
    const section = formatLiveGenerationReportLineage(lineage);
    const validation = validateLiveGenerationReportLineage({
      executionMode: "production",
      slides: lineage,
    });

    // Then
    expect(section.includes("image turn turn_image_001")).toBe(true);
    expect(validation).toEqual({ kind: "ready" });
  });
});

function hashA(): string {
  return `sha256:${"a".repeat(64)}`;
}
