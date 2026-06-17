import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { GeneratedSlide, SlideSpec } from "@/lib/deck-types";
import { ReviewGalleryPanel } from "./ReviewGalleryPanel";
import {
  approveReviewSlide,
  buildReviewGalleryItems,
  canAdvanceToVectorize,
  requestSelectedSlideRegeneration,
} from "./review-gallery-model";

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
});

function slidesFixture(): readonly GeneratedSlide[] {
  return [
    { number: 1, version: 1, status: "ready", imageDescriptor: "one" },
    { number: 2, version: 1, status: "ready", imageDescriptor: "two" },
  ];
}

function specsFixture(): readonly SlideSpec[] {
  return [
    {
      number: 1,
      title: "문제",
      role: "Problem",
      coreMessage: "문제가 크다",
      visualType: "카드",
      evidence: [],
      editableElements: [],
    },
    {
      number: 2,
      title: "시장",
      role: "Market",
      coreMessage: "시장이 크다",
      visualType: "차트",
      evidence: ["claim_001"],
      editableElements: [],
    },
  ];
}
