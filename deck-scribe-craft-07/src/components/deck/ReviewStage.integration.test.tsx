import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReviewStage } from "./ReviewStage";
import type { DeckProject } from "@/lib/deck-types";

describe("review stage", () => {
  test("keeps the desktop preview card at content height instead of grid-stretching", () => {
    const markup = renderToStaticMarkup(<ReviewStage project={reviewProjectFixture()} />);

    expect(markup.includes("items-start")).toBe(true);
    expect(markup.includes("aspect-video")).toBe(true);
  });
});

function reviewProjectFixture(): DeckProject {
  return {
    id: "project_review",
    name: "Review UI",
    initialPrompt: "Build a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "SLIDE_REVIEW_PENDING",
    createdAt: 1,
    updatedAt: 2,
    plan: {
      id: "plan_001",
      markdown: "# Plan",
      approvedHash: "sha256:plan",
      slides: [
        {
          number: 1,
          title: "Workflow bottleneck",
          role: "problem",
          coreMessage: "Research, planning, and design drift when the UI hides state.",
          visualType: "comparison",
          evidence: [],
          editableElements: [],
        },
      ],
    },
    design: {
      id: "design_001",
      canvas: { ratio: "16:9", w: 1600, h: 900, safeMargin: { x: 96, y: 72 } },
      grid: { columns: 12, gutter: 24 },
      colors: {
        background: "#ffffff",
        textPrimary: "#111827",
        textSecondary: "#4b5563",
        primary: "#2563eb",
        secondary: "#14b8a6",
        accent: "#f97316",
      },
      typography: {
        titleStyle: "bold",
        bodyStyle: "regular",
        title: { style: "bold", minPx: 44, maxPx: 72 },
        body: { style: "regular", minPx: 24, maxPx: 34 },
        caption: { style: "regular", minPx: 14, maxPx: 18 },
        number: { style: "mono", minPx: 20, maxPx: 28 },
      },
      layoutRules: [],
      componentRules: [],
      visualLanguage: "clean",
      negativeRules: [],
      approvedHash: "sha256:design",
    },
    slides: [
      {
        number: 1,
        version: 1,
        status: "ready",
        imageDescriptor: "review slide",
      },
    ],
    invalidated: {},
    approvalLog: [],
  };
}
