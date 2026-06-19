import { describe, expect, test } from "bun:test";
import type { FinalSlideComposition } from "@/lib/final-slide-compositor";
import { encodeSolidPngDataUrl } from "@/lib/png-encoder";
import {
  buildReviewGalleryItems,
  validateReviewGalleryLiveCompositions,
} from "./review-gallery-model";

describe("review gallery live composition validation", () => {
  test("blocks a required editable overlay role that has no compositor bounds", () => {
    // Given
    const items = buildReviewGalleryItems({
      slides: [{ number: 1, version: 1, status: "ready", imageDescriptor: "slide 1" }],
      specs: [
        {
          number: 1,
          title: "시장",
          role: "Market",
          coreMessage: "시장이 크다",
          visualType: "chart",
          evidence: ["claim_001"],
          editableElements: ["title", "body", "chart", "source"],
        },
      ],
      selectedSlideNumber: 1,
      compositions: [compositionMissingSourceBounds()],
    });

    // When
    const validation = validateReviewGalleryLiveCompositions({
      items,
      expectedSlideCount: 1,
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["missing_editable_overlay"]);
    expect(validation.issues[0]?.message).toBe("Missing editable source overlay.");
  });

  test("blocks stored background artifacts from another slide", () => {
    // Given
    const items = buildReviewGalleryItems({
      slides: [{ number: 1, version: 1, status: "ready", imageDescriptor: "slide 1" }],
      specs: [slideSpec()],
      selectedSlideNumber: 1,
      compositions: [compositionWithCrossSlideBackground()],
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
      "stored_background_artifact_slide_mismatch",
    ]);
  });

  test("blocks compositor SVG that omits the stored background artifact identity", () => {
    // Given
    const items = buildReviewGalleryItems({
      slides: [{ number: 1, version: 1, status: "ready", imageDescriptor: "slide 1" }],
      specs: [slideSpec()],
      selectedSlideNumber: 1,
      compositions: [{ ...validComposition(), svg: '<svg data-final-slide="1"></svg>' }],
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
      "compositor_svg_artifact_mismatch",
    ]);
  });

  test("blocks non-image live providers as compositor backgrounds", () => {
    // Given
    const items = buildReviewGalleryItems({
      slides: [{ number: 1, version: 1, status: "ready", imageDescriptor: "slide 1" }],
      specs: [slideSpec()],
      selectedSlideNumber: 1,
      compositions: [{ ...validComposition(), backgroundProviderId: "codex" }],
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
      "background_provider_not_live_image",
    ]);
  });

  test("blocks duplicate review items that hide a missing compositor slide", () => {
    // Given
    const items = buildReviewGalleryItems({
      slides: [
        { number: 1, version: 1, status: "ready", imageDescriptor: "slide 1" },
        { number: 1, version: 1, status: "ready", imageDescriptor: "slide 1 duplicate" },
      ],
      specs: [slideSpec()],
      selectedSlideNumber: 1,
      compositions: [validComposition()],
    });

    // When
    const validation = validateReviewGalleryLiveCompositions({
      items,
      expectedSlideCount: 2,
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "duplicate_compositor_slide",
      "missing_compositor_slide",
    ]);
  });
});

function compositionMissingSourceBounds(): FinalSlideComposition {
  const composition = validComposition();
  return {
    ...composition,
    overlayBounds: composition.overlayBounds.filter((overlay) => overlay.role !== "source"),
  };
}

function compositionWithCrossSlideBackground(): FinalSlideComposition {
  return {
    ...validComposition(),
    backgroundArtifact: {
      artifactId: "project_image_slide_002_v1",
      path: "projects/project/slides/images/slide_002.v1.png",
      hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  };
}

function validComposition(): FinalSlideComposition {
  return {
    slideNumber: 1,
    exportBasis: "compositor",
    canvas: { width: 1600, height: 900 },
    backgroundProviderId: "openaiImage",
    backgroundArtifact: {
      artifactId: "project_image_slide_001_v1",
      path: "projects/project/slides/images/slide_001.v1.png",
      hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    overlayRoles: ["title", "body", "chart", "source"],
    overlayBounds: [
      { id: "title_1", role: "title", bounds: { x: 100, y: 100, w: 500, h: 90 } },
      { id: "body_1", role: "body", bounds: { x: 100, y: 220, w: 520, h: 180 } },
      { id: "chart_1", role: "chart", bounds: { x: 720, y: 180, w: 620, h: 360 } },
      { id: "source_1", role: "source", bounds: { x: 100, y: 820, w: 760, h: 40 } },
    ],
    svg: [
      '<svg data-final-slide="1"',
      'data-background-artifact-id="project_image_slide_001_v1"',
      'data-background-artifact-path="projects/project/slides/images/slide_001.v1.png"',
      'data-background-artifact-hash="sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">',
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
