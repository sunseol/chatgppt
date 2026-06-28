import type {
  Claim,
  ResearchPack,
  ResearchReinforcementRequest,
  ResearchReviewSourceDecision,
  ResearchReviewState,
} from "./research-types";

export type ExcludeResearchSourceInput = {
  readonly pack: ResearchPack;
  readonly sourceId: string;
  readonly reason: string;
  readonly decidedAt: number;
};

export type RequestResearchReinforcementInput = {
  readonly pack: ResearchPack;
  readonly prompt: string;
  readonly requestedAt: number;
};

export type ResolveResearchReinforcementInput = {
  readonly pack: ResearchPack;
  readonly requestId: string;
  readonly resolvedAt: number;
};

export function excludeResearchSource(input: ExcludeResearchSourceInput): ResearchPack {
  if (!input.pack.sources.some((source) => source.id === input.sourceId)) return input.pack;

  const removedDatasetIds = new Set(
    input.pack.datasets
      .filter((dataset) => dataset.sourceIds.includes(input.sourceId))
      .map((dataset) => dataset.id),
  );
  const message = `출처 제외: ${input.sourceId}`;
  const next = clearApprovedHash({
    ...input.pack,
    sources: input.pack.sources.filter((source) => source.id !== input.sourceId),
    claims: input.pack.claims.map((claim) =>
      removeSourceFromClaim({ claim, sourceId: input.sourceId, removedDatasetIds }),
    ),
    datasets: input.pack.datasets.filter((dataset) => !removedDatasetIds.has(dataset.id)),
    charts: input.pack.charts.filter((chart) => !removedDatasetIds.has(chart.datasetId)),
    factCheckReport: {
      ...input.pack.factCheckReport,
      issues: [
        ...input.pack.factCheckReport.issues,
        {
          id: `issue_exclude_${input.pack.factCheckReport.issues.length + 1}`,
          severity: "info",
          sourceId: input.sourceId,
          message,
          uncertain: true,
        },
      ],
      uncertainItems: [...input.pack.factCheckReport.uncertainItems, message],
    },
    review: appendSourceDecision(input.pack.review, {
      sourceId: input.sourceId,
      decision: "excluded",
      reason: input.reason.trim(),
      decidedAt: input.decidedAt,
    }),
  });

  return next;
}

export function requestResearchReinforcement(
  input: RequestResearchReinforcementInput,
): ResearchPack {
  const prompt = input.prompt.trim();
  if (!prompt) return input.pack;

  const request: ResearchReinforcementRequest = {
    id: `reinforce_${(input.pack.review?.reinforcementRequests.length ?? 0) + 1}`,
    prompt,
    status: "pending",
    requestedAt: input.requestedAt,
  };
  const message = `보강 요청: ${prompt}`;

  return clearApprovedHash({
    ...input.pack,
    factCheckReport: {
      ...input.pack.factCheckReport,
      issues: [
        ...input.pack.factCheckReport.issues,
        {
          id: `issue_reinforce_${input.pack.factCheckReport.issues.length + 1}`,
          severity: "info",
          message,
          uncertain: true,
        },
      ],
      uncertainItems: [...input.pack.factCheckReport.uncertainItems, message],
    },
    review: appendReinforcementRequest(input.pack.review, request),
  });
}

export function resolveResearchReinforcementRequest(
  input: ResolveResearchReinforcementInput,
): ResearchPack {
  if (!input.pack.review) return input.pack;

  let changed = false;
  const reinforcementRequests = input.pack.review.reinforcementRequests.map((request) => {
    if (request.id !== input.requestId) return request;
    changed = true;
    return { ...request, status: "resolved" as const, resolvedAt: input.resolvedAt };
  });

  if (!changed) return input.pack;
  return {
    ...input.pack,
    review: {
      ...input.pack.review,
      reinforcementRequests,
    },
  };
}

export function getPendingResearchReinforcementRequests(
  pack: ResearchPack,
): readonly ResearchReinforcementRequest[] {
  return (pack.review?.reinforcementRequests ?? []).filter(
    (request) => request.status === "pending",
  );
}

function removeSourceFromClaim(input: {
  readonly claim: Claim;
  readonly sourceId: string;
  readonly removedDatasetIds: ReadonlySet<string>;
}): Claim {
  const sourceIds = input.claim.sourceIds.filter((id) => id !== input.sourceId);
  const datasetIds = input.claim.datasetIds.filter((id) => !input.removedDatasetIds.has(id));
  const numericEvidence = input.claim.numericEvidence.filter(
    (evidence) => evidence.sourceId !== input.sourceId,
  );
  const unsupported = sourceIds.length === 0 && datasetIds.length === 0;

  return {
    ...input.claim,
    sourceIds,
    datasetIds,
    numericEvidence,
    hasNumber: numericEvidence.length > 0,
    needsUserReview: input.claim.needsUserReview || unsupported,
    status: unsupported ? "assumption" : input.claim.status,
    confidence: unsupported ? "assumption" : input.claim.confidence,
  };
}

function appendSourceDecision(
  review: ResearchReviewState | undefined,
  decision: ResearchReviewSourceDecision,
): ResearchReviewState {
  return {
    sourceDecisions: [...(review?.sourceDecisions ?? []), decision],
    reinforcementRequests: [...(review?.reinforcementRequests ?? [])],
  };
}

function appendReinforcementRequest(
  review: ResearchReviewState | undefined,
  request: ResearchReinforcementRequest,
): ResearchReviewState {
  return {
    sourceDecisions: [...(review?.sourceDecisions ?? [])],
    reinforcementRequests: [...(review?.reinforcementRequests ?? []), request],
  };
}

function clearApprovedHash(pack: ResearchPack): ResearchPack {
  if (pack.approvedHash === undefined) return pack;
  const next = { ...pack };
  delete next.approvedHash;
  return next;
}
