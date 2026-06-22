import { describe, expect, test } from "bun:test";
import type { FinalSlideComposition } from "@/lib/final-slide-compositor";
import { encodeSolidPngDataUrl } from "@/lib/png-encoder";
import {
  buildReviewGalleryItems,
  validateReviewGalleryLiveCompositions,
} from "./review-gallery-model";

describe("review gallery compositor preview validation", () => {
  test("blocks reused compositor preview PNGs across distinct review items", () => {
    // Given
    const reusedPreview = encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 245, g: 246, b: 248, a: 255 },
    });
    const items = buildReviewGalleryItems({
      slides: [
        { number: 1, version: 1, status: "ready", imageDescriptor: "slide 1" },
        { number: 2, version: 1, status: "ready", imageDescriptor: "slide 2" },
      ],
      specs: [slideSpec(1), slideSpec(2)],
      selectedSlideNumber: 1,
      compositions: [validComposition(1, reusedPreview), validComposition(2, reusedPreview)],
    });

    // When
    const validation = validateReviewGalleryLiveCompositions({
      items,
      expectedSlideCount: 2,
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["duplicate_compositor_preview"]);
  });
});

function validComposition(slideNumber: number, previewPngDataUrl: string): FinalSlideComposition {
  const slideToken = String(slideNumber).padStart(3, "0");
  const artifact = {
    artifactId: `project_image_slide_${slideToken}_v1`,
    path: `projects/project/slides/images/slide_${slideToken}.v1.png`,
    hash: `sha256:${String(slideNumber).repeat(64).slice(0, 64)}`,
  };
  return {
    slideNumber,
    exportBasis: "compositor",
    canvas: { width: 1600, height: 900 },
    backgroundProviderId: "openaiImage",
    backgroundArtifact: artifact,
    overlayRoles: ["title", "body", "chart", "source"],
    overlayBounds: [
      { id: `title_${slideNumber}`, role: "title", bounds: { x: 100, y: 100, w: 500, h: 90 } },
      { id: `body_${slideNumber}`, role: "body", bounds: { x: 100, y: 220, w: 520, h: 180 } },
      { id: `chart_${slideNumber}`, role: "chart", bounds: { x: 720, y: 180, w: 620, h: 360 } },
      { id: `source_${slideNumber}`, role: "source", bounds: { x: 100, y: 820, w: 760, h: 40 } },
    ],
    svg: [
      `<svg data-final-slide="${slideNumber}"`,
      `data-background-artifact-id="${artifact.artifactId}"`,
      `data-background-artifact-path="${artifact.path}"`,
      `data-background-artifact-hash="${artifact.hash}">`,
      "</svg>",
    ].join(" "),
    previewPngDataUrl,
  };
}

function slideSpec(number: number) {
  return {
    number,
    title: "시장",
    role: "Market",
    coreMessage: "시장이 크다",
    visualType: "chart",
    evidence: ["claim_001"],
    editableElements: ["title", "body", "chart", "source"],
  };
}
