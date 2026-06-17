import type { DeckPlan, DesignSystem, InterviewBrief } from "./deck-types";

export type DesignSystemGenerationIssue =
  | "Deck plan must be approved before generating the design system."
  | "Deck plan must include at least one slide."
  | "Unexpected design system generation result.";

export type SlideDesignSystemRef = {
  readonly slideNumber: number;
  readonly designSystemId: string;
};

export type DesignSystemGenerationResult =
  | {
      readonly kind: "ready";
      readonly design: DesignSystem;
      readonly slideRefs: readonly SlideDesignSystemRef[];
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly DesignSystemGenerationIssue[];
    };

export type DesignSystemGenerationInput = {
  readonly brief: InterviewBrief;
  readonly plan: DeckPlan;
};

export class DesignSystemGenerationError extends Error {
  readonly issues: readonly DesignSystemGenerationIssue[];

  constructor(issues: readonly DesignSystemGenerationIssue[]) {
    super(issues.join(" "));
    this.name = "DesignSystemGenerationError";
    this.issues = issues;
  }
}

const MANDATORY_NEGATIVE_RULES = [
  "do not invent chart values",
  "do not use tiny unreadable text",
  "do not use random gradients",
] as const;

export function generateDesignSystemFromPlan(
  input: DesignSystemGenerationInput,
): DesignSystemGenerationResult {
  const issues = designSystemGenerationIssues(input.plan);
  if (issues.length > 0) return { kind: "blocked", issues };

  const designSystemId = createDesignSystemId(input.plan);
  const design = createDesignSystem(input.brief, input.plan, designSystemId);
  return {
    kind: "ready",
    design,
    slideRefs: input.plan.slides.map((slide) => ({
      slideNumber: slide.number,
      designSystemId,
    })),
  };
}

export function requireDesignSystemFromPlan(input: DesignSystemGenerationInput): DesignSystem {
  const result = generateDesignSystemFromPlan(input);
  switch (result.kind) {
    case "ready":
      return result.design;
    case "blocked":
      throw new DesignSystemGenerationError(result.issues);
    default:
      return assertNever(result);
  }
}

function designSystemGenerationIssues(plan: DeckPlan): readonly DesignSystemGenerationIssue[] {
  const approvalIssues: readonly DesignSystemGenerationIssue[] = plan.approvedHash
    ? []
    : ["Deck plan must be approved before generating the design system."];
  const slideIssues: readonly DesignSystemGenerationIssue[] =
    plan.slides.length > 0 ? [] : ["Deck plan must include at least one slide."];
  return [...approvalIssues, ...slideIssues];
}

function createDesignSystem(
  brief: InterviewBrief,
  plan: DeckPlan,
  designSystemId: string,
): DesignSystem {
  const dim = brief.aspectRatio === "16:9" ? { w: 1920, h: 1080 } : { w: 1440, h: 1080 };
  return {
    id: designSystemId,
    canvas: { ratio: brief.aspectRatio, ...dim, safeMargin: { x: 96, y: 72 } },
    grid: { columns: 12, gutter: 24 },
    colors: {
      background: "#F7F4EF",
      textPrimary: "#1A1B26",
      textSecondary: "#5C6070",
      primary: "#1F3A5F",
      secondary: "#7C9AB8",
      accent: "#D89A3F",
    },
    typography: {
      titleStyle: "Bold geometric serif, 56-84pt",
      bodyStyle: "Clean sans, 28-38pt",
      title: { style: "Bold geometric serif", minPx: 56, maxPx: 84 },
      body: { style: "Clean sans", minPx: 28, maxPx: 38 },
      caption: { style: "Clean sans", minPx: 18, maxPx: 24 },
      number: { style: "Tabular sans", minPx: 42, maxPx: 72 },
    },
    layoutRules: [
      "title top-left",
      "same safe margin across every slide",
      "source caption bottom-left when evidence is present",
      "all slides reference the deck-wide design system id",
    ],
    componentRules: componentRulesForPlan(plan),
    visualLanguage: visualLanguageForBrief(brief),
    negativeRules: [
      ...MANDATORY_NEGATIVE_RULES,
      "임의 그라데이션 금지",
      "작아서 읽기 어려운 본문 금지",
      "출처 없는 수치 시각화 금지",
      "제목 위치 슬라이드 간 변경 금지",
    ],
  };
}

function componentRulesForPlan(plan: DeckPlan): string[] {
  const chartRule = plan.slides.some((slide) => isChartVisual(slide.visualType))
    ? ["charts use approved datasets only"]
    : [];
  return [
    ...chartRule,
    "cards use 8px radius",
    "tables keep readable row spacing",
    "editable layers inherit token names from the design system",
  ];
}

function visualLanguageForBrief(brief: InterviewBrief): string {
  return `Editorial consulting - ${brief.tone.join(", ")}`;
}

function isChartVisual(visualType: string): boolean {
  return /chart|bar|line|graph|차트|막대|그래프/.test(visualType.toLowerCase());
}

function createDesignSystemId(plan: DeckPlan): string {
  return `ds_${checksum(`${plan.id}|${plan.approvedHash ?? ""}|${plan.slides.length}`)}`;
}

function checksum(value: string): string {
  return Math.abs([...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) | 0, 7))
    .toString(16)
    .padStart(8, "0");
}

function assertNever(value: never): never {
  throw new DesignSystemGenerationError(["Unexpected design system generation result."]);
}
