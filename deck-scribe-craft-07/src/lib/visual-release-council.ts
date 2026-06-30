export const VISUAL_RELEASE_COUNCIL_REVIEWERS = [
  "agy",
  "model_1",
  "model_2",
  "model_3",
  "model_4",
  "model_5",
  "model_6",
] as const;

export type VisualReleaseCouncilReviewerId = (typeof VISUAL_RELEASE_COUNCIL_REVIEWERS)[number];
export type VisualReleaseDefectSeverity = "P0" | "P1" | "P2";

export type VisualReleaseHardGate = {
  readonly id: string;
  readonly passed: boolean;
  readonly evidencePath: string;
};

export type VisualReleaseDefect = {
  readonly severity: VisualReleaseDefectSeverity;
  readonly slideNumber?: number;
  readonly description: string;
  readonly resolved: boolean;
};

export type VisualReleaseCouncilReview = {
  readonly reviewerId: VisualReleaseCouncilReviewerId;
  readonly score: number;
  readonly evidencePath: string;
  readonly defects: readonly VisualReleaseDefect[];
};

export type VisualReleaseCouncilInput = {
  readonly hardGates: readonly VisualReleaseHardGate[];
  readonly reviews: readonly VisualReleaseCouncilReview[];
  readonly targetScore?: number;
};

export type VisualReleaseCouncilAlertCode =
  | "hard_gate_failed"
  | "missing_hard_gate_evidence"
  | "missing_reviewer"
  | "review_score_below_target"
  | "missing_review_evidence"
  | "blocking_defect_reported";

export type VisualReleaseCouncilAlert = {
  readonly code: VisualReleaseCouncilAlertCode;
  readonly message: string;
  readonly ref: string;
};

export type VisualReleaseCouncilReadout = {
  readonly hardGateStatus: "passed" | "blocked";
  readonly councilAdvisoryStatus: "target_met" | "target_not_met";
  readonly targetScore: number;
  readonly reviewerCount: number;
  readonly averageScore: number;
  readonly minimumScore: number;
  readonly alerts: readonly VisualReleaseCouncilAlert[];
};

const DEFAULT_TARGET_SCORE = 98;

export function evaluateVisualReleaseCouncil(
  input: VisualReleaseCouncilInput,
): VisualReleaseCouncilReadout {
  const targetScore = input.targetScore ?? DEFAULT_TARGET_SCORE;
  const hardGateAlerts = hardGateIssues(input.hardGates);
  const councilAlerts = councilIssues(input.reviews, targetScore);
  const scores = input.reviews.map((review) => review.score);
  const hardGateStatus = hardGateAlerts.length === 0 ? "passed" : "blocked";
  const councilAdvisoryStatus = councilAlerts.length === 0 ? "target_met" : "target_not_met";

  return {
    hardGateStatus,
    councilAdvisoryStatus,
    targetScore,
    reviewerCount: input.reviews.length,
    averageScore: scores.length === 0 ? 0 : round1(scores.reduce(sum, 0) / scores.length),
    minimumScore: scores.length === 0 ? 0 : Math.min(...scores),
    alerts: [...hardGateAlerts, ...councilAlerts],
  };
}

function hardGateIssues(
  gates: readonly VisualReleaseHardGate[],
): readonly VisualReleaseCouncilAlert[] {
  return gates.flatMap((gate): readonly VisualReleaseCouncilAlert[] => [
    ...(gate.passed
      ? []
      : [alert("hard_gate_failed", "Deterministic visual hard gate failed.", gate.id)]),
    ...(gate.evidencePath.trim().length > 0
      ? []
      : [
          alert(
            "missing_hard_gate_evidence",
            "Deterministic visual hard gate must cite machine-verifiable evidence.",
            gate.id,
          ),
        ]),
  ]);
}

function councilIssues(
  reviews: readonly VisualReleaseCouncilReview[],
  targetScore: number,
): readonly VisualReleaseCouncilAlert[] {
  const byReviewer = new Map(reviews.map((review) => [review.reviewerId, review]));
  return [
    ...VISUAL_RELEASE_COUNCIL_REVIEWERS.flatMap(
      (reviewerId): readonly VisualReleaseCouncilAlert[] =>
        byReviewer.has(reviewerId)
          ? []
          : [alert("missing_reviewer", "Visual council advisory review is missing.", reviewerId)],
    ),
    ...reviews.flatMap((review) => reviewIssues(review, targetScore)),
  ];
}

function reviewIssues(
  review: VisualReleaseCouncilReview,
  targetScore: number,
): readonly VisualReleaseCouncilAlert[] {
  return [
    ...(review.score >= targetScore
      ? []
      : [
          alert(
            "review_score_below_target",
            `Visual council advisory score is below ${targetScore}.`,
            review.reviewerId,
          ),
        ]),
    ...(review.evidencePath.trim().length > 0
      ? []
      : [
          alert(
            "missing_review_evidence",
            "Visual council advisory review must cite evidence.",
            review.reviewerId,
          ),
        ]),
    ...review.defects
      .filter(
        (defect) => !defect.resolved && (defect.severity === "P0" || defect.severity === "P1"),
      )
      .map((defect) =>
        alert(
          "blocking_defect_reported",
          `Visual council reported unresolved ${defect.severity}: ${defect.description}`,
          defect.slideNumber === undefined
            ? review.reviewerId
            : `${review.reviewerId}:slide-${defect.slideNumber}`,
        ),
      ),
  ];
}

function alert(
  code: VisualReleaseCouncilAlertCode,
  message: string,
  ref: string,
): VisualReleaseCouncilAlert {
  return { code, message, ref };
}

function sum(total: number, score: number): number {
  return total + score;
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}
