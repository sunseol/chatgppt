import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { GeneratedSlide, SlideSpec } from "@/lib/deck-types";
import type { FinalSlideComposition } from "@/lib/final-slide-compositor";
import { encodeSolidPngDataUrl } from "@/lib/png-encoder";
import { ReviewGalleryPanel } from "./ReviewGalleryPanel";
import {
  approveReviewSlide,
  buildReviewGalleryItems,
  canAdvanceToVectorize,
  requestSelectedSlideRegeneration,
  validateReviewGalleryLiveCompositions,
} from "./review-gallery-model";

type BackgroundArtifactRef = NonNullable<FinalSlideComposition["backgroundArtifact"]>;

describe("slide review gallery", () => {
  test("renders required review controls and failed QA state", () => {
    const items = buildReviewGalleryItems({
      slides: slidesFixture(),
      specs: specsFixture(),
      selectedSlideNumber: 2,
      qaBySlide: { 1: "passed", 2: "failed" },
    });
    const markup = renderToStaticMarkup(
      <ReviewGalleryPanel
        items={items}
        selectedSlideNumber={2}
        canRegenerate
        onSelect={() => undefined}
        onApproveSelected={() => undefined}
        onRegenerateSelected={() => undefined}
        onDeleteRequest={() => undefined}
        onAddRequest={() => undefined}
      />,
    );

    expect(markup.includes("검증 실패")).toBe(true);
    expect(markup.includes("선택 슬라이드 승인")).toBe(true);
    expect(markup.includes("선택 슬라이드 재생성")).toBe(true);
    expect(markup.includes("삭제 요청")).toBe(true);
    expect(markup.includes("추가 요청")).toBe(true);
    expect(markup.includes("부분 수정 (실험)")).toBe(true);
    expect(markup.includes("disabled")).toBe(true);
  });

  test("blocks vectorization until every slide is approved and QA-passed", () => {
    const failedItems = buildReviewGalleryItems({
      slides: slidesFixture().map((slide) => ({ ...slide, status: "approved" })),
      specs: specsFixture(),
      selectedSlideNumber: 1,
      qaBySlide: { 1: "passed", 2: "failed" },
    });
    const waitingItems = buildReviewGalleryItems({
      slides: slidesFixture(),
      specs: specsFixture(),
      selectedSlideNumber: 1,
      qaBySlide: { 1: "passed", 2: "passed" },
    });
    const approvedItems = buildReviewGalleryItems({
      slides: slidesFixture().map((slide) => ({ ...slide, status: "approved" })),
      specs: specsFixture(),
      selectedSlideNumber: 1,
      qaBySlide: { 1: "passed", 2: "passed" },
    });

    expect(canAdvanceToVectorize(failedItems)).toBe(false);
    expect(canAdvanceToVectorize(waitingItems)).toBe(false);
    expect(canAdvanceToVectorize(approvedItems)).toBe(true);
  });

  test("supports per-slide approval and regeneration updates", () => {
    const approved = approveReviewSlide(slidesFixture(), 2);
    const regenerated = requestSelectedSlideRegeneration(approved, 2, "차트를 더 크게");

    expect(approved.find((slide) => slide.number === 2)?.status).toBe("approved");
    expect(regenerated.find((slide) => slide.number === 2)?.version).toBe(2);
    expect(regenerated.find((slide) => slide.number === 2)?.notes).toBe("차트를 더 크게");
  });

  test("renders five compositor thumbnails and the selected presentation preview", () => {
    const items = buildReviewGalleryItems({
      slides: slidesFixture(5),
      specs: specsFixture(5),
      selectedSlideNumber: 3,
      compositions: compositionsFixture(5),
    });
    const markup = renderToStaticMarkup(
      <ReviewGalleryPanel
        items={items}
        selectedSlideNumber={3}
        canRegenerate
        onSelect={() => undefined}
        onApproveSelected={() => undefined}
        onRegenerateSelected={() => undefined}
        onDeleteRequest={() => undefined}
        onAddRequest={() => undefined}
      />,
    );

    expect(markup.match(/data-compositor-thumbnail=/g)?.length).toBe(5);
    expect(markup.includes('data-selected-composition="3"')).toBe(true);
    expect(markup.includes('data-presentation-preview="3"')).toBe(true);
    expect(markup.includes('data-export-basis="compositor"')).toBe(true);
    expect(
      markup.includes(
        'data-background-artifact-path="projects/project/slides/images/slide_003.v1.png"',
      ),
    ).toBe(true);
  });

  test("flags mock backgrounds and random image text collisions before approval", () => {
    const items = buildReviewGalleryItems({
      slides: slidesFixture(5),
      specs: specsFixture(5),
      selectedSlideNumber: 1,
      compositions: compositionsFixture(5, { mockSlideNumber: 2 }),
    });

    const validation = validateReviewGalleryLiveCompositions({
      items,
      backgroundTextDetections: [
        {
          slideNumber: 3,
          text: "fake 42%",
          bounds: { x: 100, y: 100, w: 240, h: 80 },
        },
      ],
    });

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "mock_background_artifact",
      "text_overlay_collision",
    ]);
  });

  test("blocks live review when a compositor result lacks a stored background artifact", () => {
    const items = buildReviewGalleryItems({
      slides: slidesFixture(5),
      specs: specsFixture(5),
      selectedSlideNumber: 1,
      compositions: compositionsFixture(5, { missingStoredArtifactSlideNumber: 4 }),
    });

    const validation = validateReviewGalleryLiveCompositions({ items });

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "missing_stored_background_artifact",
    ]);
    expect(validation.issues[0]).toEqual({
      code: "missing_stored_background_artifact",
      slideNumber: 4,
      message: "Live review must reference a stored real background image artifact.",
    });
  });

  test("blocks malformed stored hashes and fake compositor preview PNGs", () => {
    const items = buildReviewGalleryItems({
      slides: slidesFixture(5),
      specs: specsFixture(5),
      selectedSlideNumber: 1,
      compositions: compositionsFixture(5, {
        malformedStoredArtifactSlideNumber: 2,
        fakePreviewSlideNumber: 3,
      }),
    });

    const validation = validateReviewGalleryLiveCompositions({ items });

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "invalid_stored_background_artifact_hash",
      "invalid_compositor_preview",
    ]);
  });
});

function slidesFixture(slideCount = 2): readonly GeneratedSlide[] {
  return Array.from({ length: slideCount }, (_, index) => ({
    number: index + 1,
    version: 1,
    status: "ready",
    imageDescriptor: `slide ${index + 1}`,
  }));
}

function specsFixture(slideCount = 2): readonly SlideSpec[] {
  return Array.from({ length: slideCount }, (_, index) => ({
    number: index + 1,
    title: index === 0 ? "문제" : `시장 ${index + 1}`,
    role: index === 0 ? "Problem" : "Market",
    coreMessage: "시장이 크다",
    visualType: "차트",
    evidence: index === 0 ? [] : ["claim_001"],
    editableElements: [],
  }));
}

function compositionsFixture(
  slideCount: number,
  options: {
    readonly mockSlideNumber?: number;
    readonly missingStoredArtifactSlideNumber?: number;
    readonly malformedStoredArtifactSlideNumber?: number;
    readonly fakePreviewSlideNumber?: number;
  } = {},
): readonly FinalSlideComposition[] {
  return Array.from({ length: slideCount }, (_, index) => {
    const slideNumber = index + 1;
    const slideToken = String(slideNumber).padStart(3, "0");
    const backgroundArtifact =
      options.missingStoredArtifactSlideNumber === slideNumber
        ? undefined
        : {
            artifactId: `project_image_slide_${slideToken}_v1`,
            path: `projects/project/slides/images/slide_${slideToken}.v1.png`,
            hash:
              options.malformedStoredArtifactSlideNumber === slideNumber
                ? `sha256:slide-${slideNumber}`
                : `sha256:${String(slideNumber).repeat(64).slice(0, 64)}`,
          };
    return {
      slideNumber,
      exportBasis: "compositor",
      canvas: { width: 1600, height: 900 },
      backgroundProviderId: options.mockSlideNumber === slideNumber ? "mock" : "openaiImage",
      overlayRoles: ["title", "body", "chart", "source"],
      overlayBounds: [
        { id: `title_${slideNumber}`, role: "title", bounds: { x: 100, y: 100, w: 500, h: 90 } },
        { id: `body_${slideNumber}`, role: "body", bounds: { x: 100, y: 220, w: 520, h: 180 } },
        {
          id: `chart_${slideNumber}`,
          role: "chart",
          bounds: { x: 720, y: 180, w: 620, h: 360 },
        },
        {
          id: `source_${slideNumber}`,
          role: "source",
          bounds: { x: 100, y: 820, w: 760, h: 40 },
        },
      ],
      ...(backgroundArtifact === undefined ? {} : { backgroundArtifact }),
      svg:
        backgroundArtifact === undefined
          ? `<svg data-final-slide="${slideNumber}"></svg>`
          : svgWithBackgroundArtifact(slideNumber, backgroundArtifact),
      previewPngDataUrl:
        options.fakePreviewSlideNumber === slideNumber
          ? "data:image/png;base64,ZmFrZQ=="
          : encodeSolidPngDataUrl({
              width: 1,
              height: 1,
              color: { r: 240 + slideNumber, g: 246, b: 248, a: 255 },
            }),
    };
  });
}

function svgWithBackgroundArtifact(slideNumber: number, artifact: BackgroundArtifactRef): string {
  return [
    `<svg data-final-slide="${slideNumber}"`,
    `data-background-artifact-id="${artifact.artifactId}"`,
    `data-background-artifact-path="${artifact.path}"`,
    `data-background-artifact-hash="${artifact.hash}">`,
    "</svg>",
  ].join(" ");
}
