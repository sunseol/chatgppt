export type RevisionDeltaRegionIntent = "must_keep" | "must_change";
export type RevisionDeltaStatus = "passed" | "warning" | "failed";
export type RevisionDeltaAction = "approve" | "approve_with_warning" | "request_revision";
export type RevisionDeltaIssueCode =
  | "must-keep-large-delta"
  | "must-keep-delta-warning"
  | "requested-change-missing";
export type RevisionDeltaSeverity = "warning" | "fatal";

export interface RevisionDeltaBounds {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface RevisionDeltaRegion {
  readonly id: string;
  readonly label: string;
  readonly intent: RevisionDeltaRegionIntent;
  readonly deltaScore: number;
  readonly beforeBounds: RevisionDeltaBounds;
  readonly afterBounds: RevisionDeltaBounds;
}

export interface CheckRevisionDeltaInput {
  readonly revisionId: string;
  readonly slideNumber: number;
  readonly originalSlideVersion: number;
  readonly revisedSlideVersion: number;
  readonly regions: readonly RevisionDeltaRegion[];
  readonly now?: () => number;
}

export interface RevisionDeltaIssue {
  readonly code: RevisionDeltaIssueCode;
  readonly severity: RevisionDeltaSeverity;
  readonly regionId: string;
  readonly label: string;
  readonly message: string;
}

export interface RevisionDeltaSummary {
  readonly totalRegionCount: number;
  readonly mustKeepRegionCount: number;
  readonly mustKeepChangedCount: number;
  readonly requestedChangeRegionCount: number;
  readonly requestedChangeHitCount: number;
  readonly maxMustKeepDeltaScore: number;
}

export interface RevisionDeltaHistoryEntry {
  readonly revisionId: string;
  readonly slideNumber: number;
  readonly originalSlideVersion: number;
  readonly revisedSlideVersion: number;
  readonly createdAt: number;
  readonly summary: RevisionDeltaSummary;
  readonly issues: readonly RevisionDeltaIssue[];
}

export interface RevisionDeltaReviewCandidate {
  readonly regionId: string;
  readonly label: string;
  readonly action: Exclude<RevisionDeltaAction, "approve">;
  readonly message: string;
}

export interface RevisionDeltaReport {
  readonly status: RevisionDeltaStatus;
  readonly recommendedAction: RevisionDeltaAction;
  readonly summary: RevisionDeltaSummary;
  readonly issues: readonly RevisionDeltaIssue[];
  readonly reviewCandidates: readonly RevisionDeltaReviewCandidate[];
  readonly historyEntry: RevisionDeltaHistoryEntry;
}

const MUST_KEEP_WARNING_DELTA = 0.15;
const MUST_KEEP_FATAL_DELTA = 0.35;
const REQUESTED_CHANGE_HIT_DELTA = 0.08;

export function checkRevisionDelta(input: CheckRevisionDeltaInput): RevisionDeltaReport {
  const issues = input.regions.flatMap(issueForRegion);
  const summary = summarizeRegions(input.regions);
  const recommendedAction = actionForIssues(issues);
  return {
    status: statusForAction(recommendedAction),
    recommendedAction,
    summary,
    issues,
    reviewCandidates: issues.map(reviewCandidateForIssue),
    historyEntry: {
      revisionId: input.revisionId,
      slideNumber: input.slideNumber,
      originalSlideVersion: input.originalSlideVersion,
      revisedSlideVersion: input.revisedSlideVersion,
      createdAt: input.now?.() ?? Date.now(),
      summary,
      issues,
    },
  };
}

function issueForRegion(region: RevisionDeltaRegion): readonly RevisionDeltaIssue[] {
  if (region.intent === "must_keep") return mustKeepIssues(region);
  return requestedChangeIssues(region);
}

function mustKeepIssues(region: RevisionDeltaRegion): readonly RevisionDeltaIssue[] {
  if (region.deltaScore >= MUST_KEEP_FATAL_DELTA) {
    return [
      {
        code: "must-keep-large-delta",
        severity: "fatal",
        regionId: region.id,
        label: region.label,
        message: `${region.label} changed ${formatPercent(
          region.deltaScore,
        )} inside a must-keep region.`,
      },
    ];
  }
  if (region.deltaScore >= MUST_KEEP_WARNING_DELTA) {
    return [
      {
        code: "must-keep-delta-warning",
        severity: "warning",
        regionId: region.id,
        label: region.label,
        message: `${region.label} changed ${formatPercent(
          region.deltaScore,
        )} inside a must-keep region.`,
      },
    ];
  }
  return [];
}

function requestedChangeIssues(region: RevisionDeltaRegion): readonly RevisionDeltaIssue[] {
  if (region.deltaScore >= REQUESTED_CHANGE_HIT_DELTA) return [];
  return [
    {
      code: "requested-change-missing",
      severity: "warning",
      regionId: region.id,
      label: region.label,
      message: `${region.label} changed only ${formatPercent(
        region.deltaScore,
      )}; requested edit may be missing.`,
    },
  ];
}

function summarizeRegions(regions: readonly RevisionDeltaRegion[]): RevisionDeltaSummary {
  const mustKeepRegions = regions.filter((region) => region.intent === "must_keep");
  const requestedChangeRegions = regions.filter((region) => region.intent === "must_change");
  return {
    totalRegionCount: regions.length,
    mustKeepRegionCount: mustKeepRegions.length,
    mustKeepChangedCount: mustKeepRegions.filter(
      (region) => region.deltaScore >= MUST_KEEP_WARNING_DELTA,
    ).length,
    requestedChangeRegionCount: requestedChangeRegions.length,
    requestedChangeHitCount: requestedChangeRegions.filter(
      (region) => region.deltaScore >= REQUESTED_CHANGE_HIT_DELTA,
    ).length,
    maxMustKeepDeltaScore: maxDelta(mustKeepRegions),
  };
}

function actionForIssues(issues: readonly RevisionDeltaIssue[]): RevisionDeltaAction {
  if (issues.some((issue) => issue.severity === "fatal")) return "request_revision";
  return issues.length > 0 ? "approve_with_warning" : "approve";
}

function statusForAction(action: RevisionDeltaAction): RevisionDeltaStatus {
  switch (action) {
    case "approve":
      return "passed";
    case "approve_with_warning":
      return "warning";
    case "request_revision":
      return "failed";
  }
}

function reviewCandidateForIssue(issue: RevisionDeltaIssue): RevisionDeltaReviewCandidate {
  return {
    regionId: issue.regionId,
    label: issue.label,
    action: issue.severity === "fatal" ? "request_revision" : "approve_with_warning",
    message: issue.message,
  };
}

function maxDelta(regions: readonly RevisionDeltaRegion[]): number {
  return regions.reduce((current, region) => Math.max(current, region.deltaScore), 0);
}

function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}
