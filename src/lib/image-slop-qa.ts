import type { GeneratedDeckConsistencyReport } from "./generated-deck-consistency";
import type { GeneratedSlideQaReport } from "./generated-slide-qa";

export type ImageSlopIssueCode =
  | "meaningless-decoration"
  | "broken-text"
  | "fake-graph"
  | "web-ui-rhythm"
  | "design-system-drift";

export type ImageSlopAction = "none" | "revise" | "regenerate";

export type ImageSlopIssue = {
  readonly code: ImageSlopIssueCode;
  readonly slideNumber: number;
  readonly message: string;
  readonly action: Exclude<ImageSlopAction, "none">;
};

export type ImageSlopChecklistItem = {
  readonly code: ImageSlopIssueCode;
  readonly label: string;
  readonly status: "passed" | "failed";
  readonly action: Exclude<ImageSlopAction, "none">;
};

export type ImageSlopQaReport = {
  readonly status: "passed" | "failed";
  readonly recommendedAction: ImageSlopAction;
  readonly checklist: readonly ImageSlopChecklistItem[];
  readonly issues: readonly ImageSlopIssue[];
};

export type EvaluateImageSlopQaInput = {
  readonly slideNumber: number;
  readonly svg: string;
  readonly slideQa: GeneratedSlideQaReport;
  readonly deckConsistency: GeneratedDeckConsistencyReport;
};

const CHECKLIST = [
  { code: "meaningless-decoration", label: "Meaningless decoration", action: "regenerate" },
  { code: "broken-text", label: "Broken or unreadable text", action: "revise" },
  { code: "fake-graph", label: "Fake graph or unbacked chart", action: "regenerate" },
  { code: "web-ui-rhythm", label: "Web UI rhythm", action: "regenerate" },
  { code: "design-system-drift", label: "Design system drift", action: "regenerate" },
] as const satisfies readonly {
  readonly code: ImageSlopIssueCode;
  readonly label: string;
  readonly action: Exclude<ImageSlopAction, "none">;
}[];

export function evaluateImageSlopQa(input: EvaluateImageSlopQaInput): ImageSlopQaReport {
  const issues = CHECKLIST.flatMap((item) => issueForChecklistItem(item, input));
  return {
    status: issues.length === 0 ? "passed" : "failed",
    recommendedAction: recommendedAction(issues),
    checklist: CHECKLIST.map((item) => ({
      ...item,
      status: issues.some((issue) => issue.code === item.code) ? "failed" : "passed",
    })),
    issues,
  };
}

function issueForChecklistItem(
  item: (typeof CHECKLIST)[number],
  input: EvaluateImageSlopQaInput,
): readonly ImageSlopIssue[] {
  if (!failsChecklist(item.code, input)) return [];
  return [
    {
      code: item.code,
      slideNumber: input.slideNumber,
      message: `${item.label} detected on slide ${input.slideNumber}.`,
      action: item.action,
    },
  ];
}

function failsChecklist(code: ImageSlopIssueCode, input: EvaluateImageSlopQaInput): boolean {
  switch (code) {
    case "meaningless-decoration":
      return /(sparkle|decoration|decorative|ornament|bokeh|blob)/i.test(input.svg);
    case "broken-text":
      return input.svg.includes("\uFFFD") || input.slideQa.metrics.unreadableTextLayerCount > 0;
    case "fake-graph":
      return /fake\s+(?:graph|chart)/i.test(input.svg) || hasUnbackedChart(input.svg);
    case "web-ui-rhythm":
      return /(<button\b|dashboard-card|navbar|sidebar|foreignObject|data-layout-ir-slide)/i.test(
        input.svg,
      );
    case "design-system-drift":
      return input.deckConsistency.regenerationCandidates.some(
        (candidate) => candidate.slideNumber === input.slideNumber,
      );
  }
}

function hasUnbackedChart(svg: string): boolean {
  return /data-layer-type="chart"[^>]*data-source-map-ids=""/i.test(svg);
}

function recommendedAction(issues: readonly ImageSlopIssue[]): ImageSlopAction {
  if (issues.some((issue) => issue.action === "regenerate")) return "regenerate";
  return issues.length > 0 ? "revise" : "none";
}
