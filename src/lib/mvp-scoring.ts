import type { DeckProject } from "./deck-types";
import type { MvpEditabilityScore } from "./editable-layer-composer";
import type { GeneratedSlideQaReport } from "./generated-slide-qa";
import type { LayoutValidationReport } from "./layout-validation";
import { workflowErrorBlocksFinalApproval } from "./workflow-error-policy";

export type MvpScoreCategoryKey =
  | "workflow"
  | "interview"
  | "research"
  | "plan"
  | "design"
  | "layout"
  | "image"
  | "editable"
  | "editor"
  | "report";

export type MvpScoreCategoryResult = {
  readonly key: MvpScoreCategoryKey;
  readonly label: string;
  readonly maxScore: 10;
  readonly score: number;
  readonly passed: boolean;
  readonly failureReasons: readonly string[];
};

export type MvpBenchmarkScoreInput = {
  readonly benchmarkId: string;
  readonly project: DeckProject;
  readonly layoutReport?: LayoutValidationReport;
  readonly imageQaReports?: readonly GeneratedSlideQaReport[];
  readonly editabilityScore?: MvpEditabilityScore;
  readonly generationReportMarkdown?: string;
  readonly fatalIssues?: readonly string[];
};

export type MvpBenchmarkScore = {
  readonly benchmarkId: string;
  readonly totalScore: number;
  readonly passed80: boolean;
  readonly releaseReady: boolean;
  readonly fatalIssues: readonly string[];
  readonly failureReasons: readonly string[];
  readonly categories: readonly MvpScoreCategoryResult[];
};

export type MvpSuiteScore = {
  readonly benchmarkCount: number;
  readonly passedBenchmarkCount: number;
  readonly passRate: number;
  readonly averageScore: number;
  readonly releaseReady: boolean;
  readonly benchmarks: readonly MvpBenchmarkScore[];
};

export function scoreMvpBenchmark(input: MvpBenchmarkScoreInput): MvpBenchmarkScore {
  const categories = [
    category("workflow", "Workflow", workflowPassed(input.project), "workflow incomplete"),
    category("interview", "Interview", hasApproved(input.project.brief), "interview missing"),
    category("research", "Research", researchPassed(input.project), "research missing"),
    category("plan", "Plan", planPassed(input.project), "plan missing"),
    category("design", "Design", hasApproved(input.project.design), "design missing"),
    category("layout", "Layout", layoutPassed(input), "layout validation failed"),
    category("image", "Image", imagePassed(input), "image QA failed"),
    category("editable", "Editable Overlay", editablePassed(input), "editable overlay failed"),
    category("editor", "Editor", editorPassed(input.project), "editor approval missing"),
    category("report", "Report", reportPassed(input), "report incomplete"),
  ];
  const totalScore = categories.reduce((sum, item) => sum + item.score, 0);
  const fatalIssues = collectFatalIssues(input);
  const passed80 = totalScore >= 80;
  return {
    benchmarkId: input.benchmarkId,
    totalScore,
    passed80,
    releaseReady: passed80 && fatalIssues.length === 0,
    fatalIssues,
    failureReasons: categories.flatMap((item) => item.failureReasons),
    categories,
  };
}

export function scoreMvpSuite(inputs: readonly MvpBenchmarkScoreInput[]): MvpSuiteScore {
  const benchmarks = inputs.map(scoreMvpBenchmark);
  const passedBenchmarkCount = benchmarks.filter((benchmark) => benchmark.releaseReady).length;
  const benchmarkCount = benchmarks.length;
  const passRate =
    benchmarkCount === 0 ? 0 : Number((passedBenchmarkCount / benchmarkCount).toFixed(3));
  const averageScore =
    benchmarkCount === 0
      ? 0
      : Number(
          (
            benchmarks.reduce((sum, benchmark) => sum + benchmark.totalScore, 0) / benchmarkCount
          ).toFixed(1),
        );
  return {
    benchmarkCount,
    passedBenchmarkCount,
    passRate,
    averageScore,
    releaseReady:
      benchmarkCount > 0 && passRate >= 0.8 && benchmarks.every((item) => item.releaseReady),
    benchmarks,
  };
}

function category(
  key: MvpScoreCategoryKey,
  label: string,
  passed: boolean,
  failureReason: string,
): MvpScoreCategoryResult {
  return {
    key,
    label,
    maxScore: 10,
    score: passed ? 10 : 0,
    passed,
    failureReasons: passed ? [] : [`${key}: ${failureReason}`],
  };
}

function workflowPassed(project: DeckProject): boolean {
  return (
    project.stage === "EXPORT_READY" &&
    Object.values(project.invalidated).every((value) => value !== true)
  );
}

function researchPassed(project: DeckProject): boolean {
  return hasApproved(project.research) && (project.research?.sources.length ?? 0) > 0;
}

function planPassed(project: DeckProject): boolean {
  return hasApproved(project.plan) && (project.plan?.slides.length ?? 0) > 0;
}

function layoutPassed(input: MvpBenchmarkScoreInput): boolean {
  const report = input.layoutReport ?? input.project.layout?.validationReport;
  return hasApproved(input.project.layout) && report?.status === "passed";
}

function imagePassed(input: MvpBenchmarkScoreInput): boolean {
  const slides = input.project.slides ?? [];
  const qaReports = input.imageQaReports ?? [];
  return (
    slides.length >= input.project.slideCount &&
    slides.every((slide) => slide.status === "approved" || slide.status === "ready") &&
    qaReports.length > 0 &&
    qaReports.every((report) => report.status === "passed")
  );
}

function editablePassed(input: MvpBenchmarkScoreInput): boolean {
  const layers = input.project.layers ?? [];
  return layers.length >= input.project.slideCount && input.editabilityScore?.passed === true;
}

function editorPassed(project: DeckProject): boolean {
  return (
    (project.layers?.length ?? 0) >= project.slideCount &&
    project.approvalLog.some((entry) => entry.stage === "editor")
  );
}

function reportPassed(input: MvpBenchmarkScoreInput): boolean {
  const report = input.generationReportMarkdown ?? "";
  const exportId = input.project.exportPackage?.artifactId;
  return (
    report.startsWith("# Generation Report") &&
    report.includes("## 9. 사용된 프롬프트 버전") &&
    report.includes("## 10. Export 패키지") &&
    exportId !== undefined &&
    report.includes(exportId)
  );
}

function collectFatalIssues(input: MvpBenchmarkScoreInput): readonly string[] {
  const projectIssues = (input.project.workflowErrors ?? [])
    .filter(workflowErrorBlocksFinalApproval)
    .map((error) => `${error.stage} ${error.kind}: ${error.cause}`);
  return [...(input.fatalIssues ?? []), ...projectIssues];
}

function hasApproved(value: { readonly approvedHash?: string } | undefined): boolean {
  return value?.approvedHash !== undefined;
}
