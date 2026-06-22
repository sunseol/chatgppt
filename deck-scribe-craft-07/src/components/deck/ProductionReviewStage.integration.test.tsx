import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductionWorkflowStage } from "@/components/deck/ProductionWorkflowStage";
import type { DeckProject } from "@/lib/deck-types";

describe("production review stage", () => {
  test("renders the live-only review UI on the production review step", () => {
    // Given
    const project = reviewProject();

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="review" />,
    );

    // Then
    expect(markup.includes("슬라이드 검토")).toBe(true);
    expect(markup.includes("이 슬라이드만 수정 생성")).toBe(true);
    expect(markup.includes("전체 슬라이드 승인하고 편집 시작")).toBe(true);
    expect(markup.includes("Live 산출물 provenance가 없는 review artifact")).toBe(false);
  });

  test("restores a pending live regeneration candidate for approval", () => {
    // Given
    const project = {
      ...reviewProject(),
      pendingLiveSlideRegenerationReview: pendingReview(),
    };

    // When
    const markup = renderToStaticMarkup(
      <ProductionWorkflowStage project={project} step="review" />,
    );

    // Then
    expect(markup.includes("기존 v1")).toBe(true);
    expect(markup.includes("수정본 v2")).toBe(true);
    expect(markup.includes("수정본 승인")).toBe(true);
    expect(markup.includes("보존 검토")).toBe(true);
  });
});

function reviewProject(): DeckProject {
  return {
    id: "p_live_review",
    name: "Live Review Project",
    initialPrompt: "검토 단계 패키지 QA",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "SLIDE_REVIEW_PENDING",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    plan: {
      id: "plan_live_review",
      markdown: "# Review",
      approvedHash: "sha256:plan",
      slides: [
        {
          number: 1,
          title: "DF-235 Review",
          role: "evidence",
          coreMessage: "Selected slide regeneration must preserve lineage.",
          visualType: "comparison",
          evidence: ["source_1"],
          editableElements: ["title", "chart", "source"],
        },
      ],
    },
    design: {
      id: "design_live_review",
      approvedHash: "sha256:design",
      canvas: { ratio: "16:9", w: 1600, h: 900, safeMargin: { x: 96, y: 72 } },
      grid: { columns: 12, gutter: 24 },
      colors: {
        background: "#f8fafc",
        textPrimary: "#111827",
        textSecondary: "#475569",
        primary: "#2563eb",
        secondary: "#14b8a6",
        accent: "#f59e0b",
      },
      typography: {
        titleStyle: "bold",
        bodyStyle: "regular",
        title: { style: "bold", minPx: 44, maxPx: 68 },
        body: { style: "regular", minPx: 24, maxPx: 34 },
        caption: { style: "regular", minPx: 14, maxPx: 18 },
        number: { style: "bold", minPx: 48, maxPx: 76 },
      },
      layoutRules: ["Keep source captions visible."],
      componentRules: ["Show before and after states."],
      visualLanguage: "release evidence",
      negativeRules: ["No mock fallback"],
    },
    slides: [
      {
        number: 1,
        version: 1,
        status: "approved",
        imageDescriptor: "codex|16:9|slide_01_layout.png|slide_generation@v1",
        notes: "projects/p_live_review/slides/images/slide_001.v1.png",
      },
    ],
    invalidated: {},
    approvalLog: [],
  };
}

function pendingReview() {
  return {
    comparison: {
      slideNumber: 1,
      originalSlideVersion: 1,
      revisedSlideVersion: 2,
      beforeImageDescriptor: "codex|16:9|slide_01_layout.png|slide_generation@v1",
      afterImageDescriptor:
        "live-regeneration|request=rev_pending|background=p_live_review_image_slide_001_v2",
      requestedChanges: ["chart area size"],
      preservedTargets: ["title text", "source caption"],
      preservationChecks: [
        {
          target: "source caption",
          status: "kept" as const,
          message: "source caption preserved by live regeneration request rev_pending.",
        },
      ],
      summary: "Slide 1 live regeneration rev_pending is ready for approval.",
    },
    liveCandidate: {
      requestId: "rev_pending",
      slide: {
        number: 1,
        version: 2,
        status: "ready" as const,
        imageDescriptor:
          "live-regeneration|request=rev_pending|background=p_live_review_image_slide_001_v2",
        notes: "chart area size",
      },
      originalBackgroundArtifactId: "p_live_review_image_slide_001_v1",
      backgroundArtifactId: "p_live_review_image_slide_001_v2",
      backgroundArtifactHash:
        "sha256:167127d22caf3a920d843e2a88e929bc37ca98f2f83f8b88b2e678805a64910a",
      deckContextId: "deckctx_pending",
      designSystemId: "design_live_review",
      mustKeep: ["title text", "source caption"],
      mustChange: ["chart area size"],
      beforeImageDescriptor: "codex|16:9|slide_01_layout.png|slide_generation@v1",
      afterImageDescriptor:
        "live-regeneration|request=rev_pending|background=p_live_review_image_slide_001_v2",
    },
  };
}
