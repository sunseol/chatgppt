import { describe, expect, test } from "bun:test";
import type { ImageArtifactStoreWrite } from "@/lib/image-artifact-store";
import { approvedProject, clock } from "./review-stage-regeneration-test-fixtures";
import { runReviewStageSlideRegeneration } from "./review-stage-regeneration";

describe("review stage live-only regeneration", () => {
  test("preserves the approved original instead of local fallback when live-only regeneration lacks Codex evidence", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];
    const project = approvedProject();

    // When
    const result = await runReviewStageSlideRegeneration({
      project,
      slides: project.slides ?? [],
      selected: 1,
      instruction: "오른쪽 차트를 더 크게 만들어줘.",
      localFallback: "disabled",
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      now: clock(1_789_930_000),
      createId: () => "rev_review_live_blocked_001",
    });

    // Then
    expect(result.slides[0]?.status).toBe("approved");
    expect(result.slides[0]?.version).toBe(1);
    expect(result.comparison).toBe(null);
    expect(result.liveCandidate).toBe(null);
    expect(result.editConsumed).toBe(false);
    expect(result.reviewEvidencePath).toBe(
      "projects/project_001/live-evidence/df235-slide-regeneration-review-rev_review_live_blocked_001.json",
    );
    expect(writes.map((write) => write.path)).toEqual([result.reviewEvidencePath]);
    const content = writes[0]?.content;
    if (typeof content !== "string") throw new Error("Expected live-only preservation evidence.");
    expect(content.includes('"outcome": "preserved_after_failure"')).toBe(true);
    expect(content.includes("codex_live_regeneration_unavailable")).toBe(true);
  });
});
