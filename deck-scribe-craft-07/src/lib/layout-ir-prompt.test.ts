import { describe, expect, test } from "bun:test";
import type { DeckPlan, DesignSystem } from "./deck-types";
import {
  buildLayoutIrPrompt,
  parseLayoutIrCandidate,
  type LayoutIrPromptIssue,
} from "./layout-ir-prompt";
import { createLayoutIrFromPlan } from "./layout-ir";
import { mockBrief, mockDesign, mockPlan, mockResearch } from "./mock-ai";

describe("layout IR prompt", () => {
  test("creates a schema-bound prompt package for approved inputs", () => {
    const { plan, design } = approvedFixtures();

    const result = buildLayoutIrPrompt({ plan, design });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.prompt.includes("# Layout IR Generation Package")).toBe(true);
    expect(result.prompt.includes("Return JSON only.")).toBe(true);
    expect(result.prompt.includes("metadata.layoutPurpose must be draft")).toBe(true);
    expect(result.prompt.includes("Allowed components: CoverHero")).toBe(true);
    expect(result.prompt.includes("Forbidden surfaces")).toBe(true);
    expect(result.prompt.includes("arbitrary CSS")).toBe(true);
    expect(result.prompt.includes("external resources")).toBe(true);
    expect(result.allowedComponentTypes.includes("ChartWithInsight")).toBe(true);
    expect(result.prompt.includes("Design negative rules: do not invent chart values")).toBe(true);
    expect(result.prompt.includes("Slide 3 | Market | ChartWithInsight")).toBe(true);
    expect(result.prompt.includes("slots: title, chart, insight, source")).toBe(true);
    expect(result.prompt.split("\n").slice(0, 20)).toEqual([
      "# Layout IR Generation Package",
      "",
      "## Required Output Contract",
      "Return JSON only.",
      "Output must pass the Layout IR JSON Schema used by the application.",
      "metadata.layoutPurpose must be draft for every slide.",
      "Use designSystemId exactly: ds_1a7cecc2",
      "Use canvas exactly: 16:9, 1920x1080, safe margin 96x72",
      "Design negative rules: do not invent chart values, do not use tiny unreadable text, do not use random gradients, 임의 그라데이션 금지, 작아서 읽기 어려운 본문 금지, 출처 없는 수치 시각화 금지, 제목 위치 슬라이드 간 변경 금지",
      "Allowed components: CoverHero, Agenda, SectionDivider, KeyMessage, TwoColumn, ChartWithInsight, MetricCards, ComparisonTable, Timeline, ImageWithCaption, ClosingSummary",
      "Allowed top-level fields: id, version, designSystemId, canvas, slides.",
      "Allowed slide fields: id, slideNumber, componentType, metadata, slots, layers.",
      "Allowed slot fields: id, role, text, sourceIds, datasetIds, tokenRefs.",
      "Allowed layer fields: id, slotId, role, editable, bboxPreference.",
      "Use only approved token refs from the component catalog.",
      "Use only sourceIds and datasetIds listed in the per-slide constraints.",
      "Set editable only as a boolean; do not add editor-specific behaviors.",
      "",
      "## Forbidden surfaces",
      "Do not output arbitrary CSS, style objects, raw color values, raw font names, JavaScript, script tags, inline event handlers, iframes, external resources, URLs, or HTML.",
    ]);
  });

  test("blocks prompt creation until plan and design are approved", () => {
    const { plan, design } = approvedFixtures();

    expect(issuesFor({ plan: { ...plan, approvedHash: undefined }, design })).toEqual([
      "Deck plan must be approved before generating Layout IR.",
    ]);
    expect(issuesFor({ plan, design: { ...design, approvedHash: undefined } })).toEqual([
      "Design system must be approved before generating Layout IR.",
    ]);
  });

  test("parses valid candidate Layout IR through the schema", () => {
    const { plan, design } = approvedFixtures();
    const candidate = createLayoutIrFromPlan({ plan, design });

    const result = parseLayoutIrCandidate(candidate);

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.ir.slides.every((slide) => slide.metadata.layoutPurpose === "draft")).toBe(true);
  });

  test("rejects candidate output with arbitrary style surfaces", () => {
    const { plan, design } = approvedFixtures();
    const [firstSlide, ...remainingSlides] = createLayoutIrFromPlan({ plan, design }).slides;
    const candidate = {
      ...createLayoutIrFromPlan({ plan, design }),
      slides: [
        {
          ...firstSlide,
          css: ".slide { color: red }",
          slots: [{ ...firstSlide.slots[0], tokenRefs: ["#ff0000"] }],
        },
        ...remainingSlides,
      ],
    };

    const result = parseLayoutIrCandidate(candidate);

    expect(result.kind).toBe("blocked");
  });
});

function approvedFixtures(): { readonly plan: DeckPlan; readonly design: DesignSystem } {
  const brief = mockBrief("검증 가능한 AI 슬라이드 제작 시스템", 8, "16:9");
  const research = mockResearch(brief);
  const plan = {
    ...mockPlan(brief, research),
    id: "plan_001",
    approvedHash: "sha256:approved-plan",
  };
  const design = { ...mockDesign(brief, plan), approvedHash: "sha256:approved-design" };
  return { plan, design };
}

function issuesFor(input: {
  readonly plan: DeckPlan;
  readonly design: DesignSystem;
}): readonly LayoutIrPromptIssue[] {
  const result = buildLayoutIrPrompt(input);
  return result.kind === "blocked" ? result.issues : [];
}
