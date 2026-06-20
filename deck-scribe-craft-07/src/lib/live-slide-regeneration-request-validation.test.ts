import { describe, expect, test } from "bun:test";
import { buildLiveSlideRegenerationRequest } from "./live-slide-regeneration";
import {
  approvedSlideFixture,
  revisionRequestFixture,
  slideSpecFixture,
} from "./live-slide-regeneration-test-fixtures";

describe("live full-slide regeneration request validation", () => {
  test("blocks blank edit instructions before provider submission", () => {
    // Given
    const revisionRequest = {
      ...revisionRequestFixture(),
      editInstruction: "   ",
    };

    // When
    const result = buildLiveSlideRegenerationRequest({
      revisionRequest,
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: "project_001_image_slide_003_v1",
      originalBackgroundRequestId: "img_req_original",
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_edit_instruction"]);
  });

  test("blocks duplicate keep or change targets before provider submission", () => {
    // Given
    const revisionRequest = {
      ...revisionRequestFixture(),
      mustKeep: ["title text", " title text "],
      mustChange: ["chart area size", "chart area size"],
    };

    // When
    const result = buildLiveSlideRegenerationRequest({
      revisionRequest,
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: "project_001_image_slide_003_v1",
      originalBackgroundRequestId: "img_req_original",
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate_revision_target"]);
  });

  test("blocks non-canonical original background evidence before provider submission", () => {
    // Given
    const revisionRequest = revisionRequestFixture();

    // When
    const result = buildLiveSlideRegenerationRequest({
      revisionRequest,
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: " project_001_image_slide_003_v1 ",
      originalBackgroundRequestId: " img_req_original ",
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "original_background_evidence_not_canonical",
    ]);
  });
});
