import { describe, expect, test } from "bun:test";
import type { GeneratedSlide, SlideSpec } from "@/lib/deck-types";
import type { FinalSlideComposition } from "@/lib/final-slide-compositor";
import { encodeSolidPngDataUrl } from "@/lib/png-encoder";
import {
  buildReviewGalleryItems,
  validateReviewGalleryLiveCompositions,
} from "./review-gallery-model";

describe("live review composition validation", () => {
  test("accepts the editable roles reserved by each slide layout", () => {
    const items = buildReviewGalleryItems({
      slides: slidesFixture(),
      specs: specsFixture(),
      selectedSlideNumber: 1,
      compositions: [
        compositionFixture(1, ["title", "subtitle"]),
        compositionFixture(2, ["title", "chart", "body", "source"]),
        compositionFixture(3, ["title", "body", "source"]),
        compositionFixture(4, ["title", "body", "source"]),
        compositionFixture(5, ["title", "body", "cta"]),
      ],
      requiredOverlayRolesBySlide: {
        1: ["title", "subtitle"],
        2: ["title", "chart", "body", "source"],
        3: ["title", "body", "source"],
        4: ["title", "body", "source"],
        5: ["title", "body", "cta"],
      },
    });

    const validation = validateReviewGalleryLiveCompositions({ items, expectedSlideCount: 5 });

    expect(validation).toEqual({ kind: "ready" });
  });
});

function slidesFixture(): readonly GeneratedSlide[] {
  return Array.from({ length: 5 }, (_, index) => ({
    number: index + 1,
    version: 1,
    status: "ready",
    imageDescriptor: `slide ${index + 1}`,
  }));
}

function specsFixture(): readonly SlideSpec[] {
  return Array.from({ length: 5 }, (_, index) => ({
    number: index + 1,
    title: `Slide ${index + 1}`,
    role: "MVP",
    coreMessage: "GPT 이미지 생성으로 PPT를 만든다.",
    visualType: "production MVP layout",
    evidence: [],
    editableElements: [],
  }));
}

function compositionFixture(
  slideNumber: number,
  overlayRoles: readonly string[],
): FinalSlideComposition {
  return {
    slideNumber,
    exportBasis: "compositor",
    canvas: { width: 1600, height: 900 },
    backgroundProviderId: "openaiImage",
    backgroundArtifact: {
      artifactId: `project_image_slide_${String(slideNumber).padStart(3, "0")}_v1`,
      path: `projects/project/slides/images/slide_${String(slideNumber).padStart(3, "0")}.v1.png`,
      hash: `sha256:${String(slideNumber).repeat(64).slice(0, 64)}`,
    },
    overlayRoles,
    overlayBounds: overlayRoles.map((role, index) => ({
      id: `${role}_${slideNumber}`,
      role,
      bounds: { x: 96, y: 72 + index * 80, w: 640, h: 64 },
    })),
    svg: `<svg data-final-slide="${slideNumber}"></svg>`,
    previewPngDataUrl: encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 245, g: 246, b: 248, a: 255 },
    }),
  };
}
