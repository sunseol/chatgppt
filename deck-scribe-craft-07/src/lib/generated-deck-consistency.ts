import type { DeckConsistencyReport } from "./deck-consistency-checker";
import type { GeneratedSlideQaReport } from "./generated-slide-qa";

export type GeneratedDeckConsistencyIssueCode =
  | "layout-consistency"
  | "image-qa"
  | "density-variance";

export type GeneratedDeckConsistencyIssue = {
  readonly code: GeneratedDeckConsistencyIssueCode;
  readonly slideNumber: number;
  readonly message: string;
};

export type GeneratedDeckRegenerationCandidate = {
  readonly slideNumber: number;
  readonly reasons: readonly GeneratedDeckConsistencyIssueCode[];
};

export type GeneratedDeckConsistencyReport = {
  readonly status: "passed" | "failed";
  readonly summary: {
    readonly slideCount: number;
    readonly driftSlideCount: number;
    readonly designViolationRate: number;
    readonly targetViolationRate: number;
    readonly targetPassed: boolean;
  };
  readonly issues: readonly GeneratedDeckConsistencyIssue[];
  readonly regenerationCandidates: readonly GeneratedDeckRegenerationCandidate[];
};

export type SlideQaReportInput = {
  readonly slideNumber: number;
  readonly report: GeneratedSlideQaReport;
};

export type InformationDensityInput = {
  readonly slideNumber: number;
  readonly layerCount: number;
};

export type EvaluateGeneratedDeckConsistencyInput = {
  readonly slideCount: number;
  readonly layoutConsistency: DeckConsistencyReport;
  readonly slideQaReports: readonly SlideQaReportInput[];
  readonly densityBySlide: readonly InformationDensityInput[];
  readonly targetViolationRate?: number;
};

const REASON_ORDER: readonly GeneratedDeckConsistencyIssueCode[] = [
  "layout-consistency",
  "image-qa",
  "density-variance",
];

export function evaluateGeneratedDeckConsistency(
  input: EvaluateGeneratedDeckConsistencyInput,
): GeneratedDeckConsistencyReport {
  const issues = [
    ...layoutIssues(input.layoutConsistency),
    ...imageQaIssues(input.slideQaReports),
    ...densityIssues(input.densityBySlide),
  ];
  const regenerationCandidates = createCandidates(issues);
  const targetViolationRate = input.targetViolationRate ?? 0.1;
  const designViolationRate = ratio(regenerationCandidates.length, input.slideCount);
  const targetPassed = designViolationRate <= targetViolationRate;
  return {
    status: targetPassed ? "passed" : "failed",
    summary: {
      slideCount: input.slideCount,
      driftSlideCount: regenerationCandidates.length,
      designViolationRate,
      targetViolationRate,
      targetPassed,
    },
    issues,
    regenerationCandidates,
  };
}

function layoutIssues(report: DeckConsistencyReport): readonly GeneratedDeckConsistencyIssue[] {
  return report.regenerationCandidates.map((candidate) => ({
    code: "layout-consistency",
    slideNumber: candidate.slideNumber,
    message: candidate.reason,
  }));
}

function imageQaIssues(
  reports: readonly SlideQaReportInput[],
): readonly GeneratedDeckConsistencyIssue[] {
  return reports
    .filter((item) => item.report.status === "failed")
    .map((item) => ({
      code: "image-qa",
      slideNumber: item.slideNumber,
      message: item.report.issues.join(" "),
    }));
}

function densityIssues(
  densities: readonly InformationDensityInput[],
): readonly GeneratedDeckConsistencyIssue[] {
  const average = averageLayerCount(densities);
  if (average <= 0) return [];
  return densities
    .filter((item) => Math.abs(item.layerCount - average) / average > 0.4)
    .map((item) => ({
      code: "density-variance",
      slideNumber: item.slideNumber,
      message: `Slide ${item.slideNumber} layer density differs from deck average.`,
    }));
}

function createCandidates(
  issues: readonly GeneratedDeckConsistencyIssue[],
): readonly GeneratedDeckRegenerationCandidate[] {
  const slideNumbers = [...new Set(issues.map((issue) => issue.slideNumber))].sort(
    (left, right) => left - right,
  );
  return slideNumbers.map((slideNumber) => ({
    slideNumber,
    reasons: REASON_ORDER.filter((code) =>
      issues.some((issue) => issue.slideNumber === slideNumber && issue.code === code),
    ),
  }));
}

function averageLayerCount(densities: readonly InformationDensityInput[]): number {
  if (densities.length === 0) return 0;
  return densities.reduce((sum, item) => sum + item.layerCount, 0) / densities.length;
}

function ratio(count: number, total: number): number {
  return total <= 0 ? 0 : Number((count / total).toFixed(3));
}
