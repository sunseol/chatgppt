import { describe, expect, test } from "bun:test";
import { buildLiveSlideRegenerationRequest } from "./live-slide-regeneration";
import {
  approvedSlideFixture,
  revisionRequestFixture,
  slideSpecFixture,
} from "./live-slide-regeneration-test-fixtures";

describe("live full-slide regeneration approved original", () => {
  test("blocks regeneration requests unless the selected original slide is approved", () => {
    // Given
    const currentSlide = { ...approvedSlideFixture(), status: "ready" as const };

    // When
    const result = buildLiveSlideRegenerationRequest({
      revisionRequest: revisionRequestFixture(),
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide,
      originalBackgroundArtifactId: "project_001_image_slide_003_v1",
      originalBackgroundRequestId: "img_req_original",
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["original_slide_not_approved"]);
  });
});
