import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const COMPOSITOR_REVIEW_DOC = new URL("../../docs/live-compositor-review.md", import.meta.url);

describe("live compositor review documentation", () => {
  test("records the DF-234 live compositor review contract", () => {
    const compositorReview = readFileSync(COMPOSITOR_REVIEW_DOC, "utf8");

    for (const needle of "DF-234|mock_background_artifact|background_provider_not_live_image|missing_stored_background_artifact|invalid_stored_background_artifact_hash|duplicate_stored_background_artifact|stored_background_artifact_slide_mismatch|compositor_svg_artifact_mismatch|missing_editable_overlay|invalid_editable_overlay_bounds|invalid_compositor_preview|duplicate_compositor_preview|missing_title_edit_reexport_evidence|title_edit_reexport_mismatch|title edit re-export evidence|text_overlay_collision|five compositor thumbnails|presentation preview|duplicate_compositor_slide".split(
      "|",
    )) {
      expect(compositorReview.includes(needle)).toBe(true);
    }
  });
});
