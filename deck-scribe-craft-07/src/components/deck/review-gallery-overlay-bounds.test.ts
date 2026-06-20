import { describe, expect, test } from "bun:test";
import type { FinalSlideComposition } from "@/lib/final-slide-compositor";
import { encodeSolidPngDataUrl } from "@/lib/png-encoder";
import {
  buildReviewGalleryItems,
  validateReviewGalleryLiveCompositions,
} from "./review-gallery-model";

describe("review gallery overlay bounds validation", () => {
  test("blocks required editable overlays that render outside the compositor canvas", () => {
    // Given
    const composition = validComposition();
    const items = buildReviewGalleryItems({
      slides: [{ number: 1, version: 1, status: "ready", imageDescriptor: "slide 1" }],
      specs: [slideSpec()],
      selectedSlideNumber: 1,
      compositions: [
        {
          ...composition,
          overlayBounds: composition.overlayBounds.map((overlay) =>
            overlay.role === "title"
              ? { ...overlay, bounds: { x: 1700, y: 100, w: 0, h: 90 } }
              : overlay,
          ),
        },
      ],
    });

    // When
    const validation = validateReviewGalleryLiveCompositions({
      items,
      expectedSlideCount: 1,
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "invalid_editable_overlay_bounds",
    ]);
  });
});

function validComposition(): FinalSlideComposition {
  const artifact = {
    artifactId: "project_image_slide_001_v1",
    path: "projects/project/slides/images/slide_001.v1.png",
    hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  };
  return {
    slideNumber: 1,
    exportBasis: "compositor",
    canvas: { width: 1600, height: 900 },
    backgroundProviderId: "openaiImage",
    backgroundArtifact: artifact,
    overlayRoles: ["title", "body", "chart", "source"],
    overlayBounds: [
      { id: "title_1", role: "title", bounds: { x: 100, y: 100, w: 500, h: 90 } },
      { id: "body_1", role: "body", bounds: { x: 100, y: 220, w: 520, h: 180 } },
      { id: "chart_1", role: "chart", bounds: { x: 720, y: 180, w: 620, h: 360 } },
      { id: "source_1", role: "source", bounds: { x: 100, y: 820, w: 760, h: 40 } },
    ],
    svg: [
      '<svg data-final-slide="1"',
      `data-background-artifact-id="${artifact.artifactId}"`,
      `data-background-artifact-path="${artifact.path}"`,
      `data-background-artifact-hash="${artifact.hash}">`,
      "</svg>",
    ].join(" "),
    previewPngDataUrl: encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 245, g: 246, b: 248, a: 255 },
    }),
  };
}

function slideSpec() {
  return {
    number: 1,
    title: "시장",
    role: "Market",
    coreMessage: "시장이 크다",
    visualType: "chart",
    evidence: ["claim_001"],
    editableElements: ["title", "body", "chart", "source"],
  };
}
