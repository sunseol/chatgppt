import { describe, expect, test } from "bun:test";
import type { FinalSlideComposition } from "@/lib/final-slide-compositor";
import { encodeSolidPngDataUrl } from "@/lib/png-encoder";
import {
  buildReviewGalleryItems,
  validateReviewGalleryLiveCompositions,
} from "./review-gallery-model";

describe("review gallery title edit re-export evidence", () => {
  test("blocks otherwise valid live review when title edit re-export evidence is missing", () => {
    // Given
    const items = buildReviewGalleryItems({
      slides: [{ number: 1, version: 1, status: "approved", imageDescriptor: "slide 1" }],
      specs: [slideSpec()],
      selectedSlideNumber: 1,
      compositions: [validComposition()],
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
      "missing_title_edit_reexport_evidence",
    ]);
  });

  test("blocks title edit evidence that does not appear in the exported SVG", () => {
    // Given
    const items = validItems();

    // When
    const validation = validateReviewGalleryLiveCompositions({
      items,
      expectedSlideCount: 1,
      titleEditReexportEvidence: {
        slideNumber: 1,
        originalTitle: "시장",
        editedTitle: "수정된 시장",
        exportedSvgPath: "projects/project/exports/svg/slide_01.svg",
        exportedSvgContent: '<svg><text data-role="title">시장</text></svg>',
      },
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["title_edit_reexport_mismatch"]);
  });

  test("blocks title edit evidence from template export paths", () => {
    // Given
    const items = validItems();

    // When
    const validation = validateReviewGalleryLiveCompositions({
      items,
      expectedSlideCount: 1,
      titleEditReexportEvidence: {
        slideNumber: 1,
        originalTitle: "시장",
        editedTitle: "수정된 시장",
        exportedSvgPath: "templates/live-review/exports/svg/slide_01.svg",
        exportedSvgContent: '<svg><text data-role="title">수정된 시장</text></svg>',
      },
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["title_edit_reexport_mismatch"]);
  });

  test("blocks title edit evidence paths that rely on boundary whitespace", () => {
    // Given
    const items = validItems();

    // When
    const validation = validateReviewGalleryLiveCompositions({
      items,
      expectedSlideCount: 1,
      titleEditReexportEvidence: {
        slideNumber: 1,
        originalTitle: "시장",
        editedTitle: "수정된 시장",
        exportedSvgPath: " projects/project/exports/svg/slide_01.svg ",
        exportedSvgContent: validExportedSvgContent("수정된 시장"),
      },
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["title_edit_reexport_mismatch"]);
  });

  test("blocks title edit evidence that is not tied to the compositor background", () => {
    // Given
    const items = validItems();

    // When
    const validation = validateReviewGalleryLiveCompositions({
      items,
      expectedSlideCount: 1,
      titleEditReexportEvidence: {
        slideNumber: 1,
        originalTitle: "시장",
        editedTitle: "수정된 시장",
        exportedSvgPath: "projects/project/exports/svg/slide_01.svg",
        exportedSvgContent:
          '<svg data-export-basis="compositor"><text data-role="title">수정된 시장</text></svg>',
      },
    });

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["title_edit_reexport_mismatch"]);
  });

  test("allows live review when title edit evidence is present in the exported SVG", () => {
    // Given
    const items = validItems();

    // When
    const validation = validateReviewGalleryLiveCompositions({
      items,
      expectedSlideCount: 1,
      titleEditReexportEvidence: {
        slideNumber: 1,
        originalTitle: "시장",
        editedTitle: "수정된 시장",
        exportedSvgPath: "projects/project/exports/svg/slide_01.svg",
        exportedSvgContent: validExportedSvgContent("수정된 시장"),
      },
    });

    // Then
    expect(validation.kind).toBe("ready");
  });
});

function validItems() {
  return buildReviewGalleryItems({
    slides: [{ number: 1, version: 1, status: "approved", imageDescriptor: "slide 1" }],
    specs: [slideSpec()],
    selectedSlideNumber: 1,
    compositions: [validComposition()],
  });
}

function validExportedSvgContent(title: string): string {
  const artifact = validBackgroundArtifact();
  return [
    '<svg data-export-basis="compositor"',
    `data-background-artifact-id="${artifact.artifactId}"`,
    `data-background-artifact-path="${artifact.path}"`,
    `data-background-artifact-hash="${artifact.hash}">`,
    `<text data-role="title">${title}</text>`,
    "</svg>",
  ].join(" ");
}

function validComposition(): FinalSlideComposition {
  const artifact = validBackgroundArtifact();
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

function validBackgroundArtifact() {
  return {
    artifactId: "project_image_slide_001_v1",
    path: "projects/project/slides/images/slide_001.v1.png",
    hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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
