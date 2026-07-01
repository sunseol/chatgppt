export type LiveWebSearchMode = "live" | "cached" | "mock";

export type SourceCandidateType = "official" | "primary" | "secondary" | "dataset";

export type LiveWebSearchCandidate = {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly discoveredAt: number;
  readonly query: string;
  readonly sourceCandidateType: SourceCandidateType;
  readonly mode: LiveWebSearchMode;
};

export type LatestnessBenchmarkEvidence = {
  readonly query: string;
  readonly mode: LiveWebSearchMode;
  readonly completedAt: number;
  readonly candidateIds: readonly string[];
};

export type LiveWebSearchEvidence = {
  readonly researchTurnId: string;
  readonly webSearchMode: LiveWebSearchMode;
  readonly queries: readonly string[];
  readonly candidates: readonly LiveWebSearchCandidate[];
  readonly latestnessBenchmark: LatestnessBenchmarkEvidence;
};

export type LiveWebSearchEvidenceIssueCode =
  | "missing_live_search_turn"
  | "non_live_search_candidate"
  | "missing_candidate_metadata"
  | "candidate_query_not_recorded"
  | "insufficient_live_domains"
  | "cached_latestness_benchmark"
  | "latestness_query_not_recorded"
  | "unknown_latestness_candidate";

export type LiveWebSearchEvidenceIssue = {
  readonly code: LiveWebSearchEvidenceIssueCode;
  readonly message: string;
  readonly candidateId?: string;
};

export type LiveWebSearchEvidenceReport = {
  readonly valid: boolean;
  readonly issues: readonly LiveWebSearchEvidenceIssue[];
};

export type LiveWebSearchEvidenceSummary = {
  readonly queryCount: number;
  readonly candidateCount: number;
  readonly liveCandidateCount: number;
  readonly domainCount: number;
  readonly latestnessBenchmarkMode: LiveWebSearchMode;
  readonly blockingIssueCodes: readonly LiveWebSearchEvidenceIssueCode[];
};

export function validateLiveWebSearchEvidence(
  evidence: LiveWebSearchEvidence,
): LiveWebSearchEvidenceReport {
  const issues = [
    ...liveSearchTurnIssues(evidence),
    ...candidateIssues(evidence.candidates, new Set(evidence.queries)),
    ...domainIssues(evidence.candidates),
    ...latestnessIssues(evidence),
  ];

  return { valid: issues.length === 0, issues };
}

export function summarizeLiveWebSearchEvidence(
  evidence: LiveWebSearchEvidence,
  report: LiveWebSearchEvidenceReport,
): LiveWebSearchEvidenceSummary {
  return {
    queryCount: evidence.queries.length,
    candidateCount: evidence.candidates.length,
    liveCandidateCount: evidence.candidates.filter((candidate) => candidate.mode === "live").length,
    domainCount: liveDomains(evidence.candidates).size,
    latestnessBenchmarkMode: evidence.latestnessBenchmark.mode,
    blockingIssueCodes: report.issues.map((issue) => issue.code),
  };
}

function liveSearchTurnIssues(
  evidence: LiveWebSearchEvidence,
): readonly LiveWebSearchEvidenceIssue[] {
  if (evidence.webSearchMode === "live" && evidence.researchTurnId.trim()) return [];
  return [
    {
      code: "missing_live_search_turn",
      message: "DF-221 requires a live web_search Research turn id.",
    },
  ];
}

function candidateIssues(
  candidates: readonly LiveWebSearchCandidate[],
  queries: ReadonlySet<string>,
): readonly LiveWebSearchEvidenceIssue[] {
  return candidates.flatMap((candidate) => [
    ...(candidate.mode === "live"
      ? []
      : [
          {
            code: "non_live_search_candidate" as const,
            candidateId: candidate.id,
            message: `Search candidate ${candidate.id} is ${candidate.mode}, not live.`,
          },
        ]),
    ...candidateMetadataIssues(candidate),
    ...candidateQueryIssues(candidate, queries),
  ]);
}

function candidateMetadataIssues(
  candidate: LiveWebSearchCandidate,
): readonly LiveWebSearchEvidenceIssue[] {
  const issues: LiveWebSearchEvidenceIssue[] = [];
  if (!isValidHttpUrl(candidate.url)) {
    issues.push(metadataIssue(candidate.id, "URL"));
  }
  if (!candidate.title.trim()) {
    issues.push(metadataIssue(candidate.id, "title"));
  }
  if (!candidate.query.trim() || candidate.discoveredAt <= 0) {
    issues.push(metadataIssue(candidate.id, "query/discovered_at"));
  }
  return issues;
}

function candidateQueryIssues(
  candidate: LiveWebSearchCandidate,
  queries: ReadonlySet<string>,
): readonly LiveWebSearchEvidenceIssue[] {
  if (!candidate.query.trim()) return [];
  return queries.has(candidate.query)
    ? []
    : [
        {
          code: "candidate_query_not_recorded",
          candidateId: candidate.id,
          message: `Search candidate ${candidate.id} references a query that is not in the event log.`,
        },
      ];
}

function domainIssues(
  candidates: readonly LiveWebSearchCandidate[],
): readonly LiveWebSearchEvidenceIssue[] {
  if (liveDomains(candidates).size >= 3) return [];
  return [
    {
      code: "insufficient_live_domains",
      message: "DF-221 requires live search candidates from at least three distinct domains.",
    },
  ];
}

function latestnessIssues(evidence: LiveWebSearchEvidence): readonly LiveWebSearchEvidenceIssue[] {
  const candidateIds = new Set(evidence.candidates.map((candidate) => candidate.id));
  return [
    ...(evidence.latestnessBenchmark.mode === "live"
      ? []
      : [
          {
            code: "cached_latestness_benchmark" as const,
            message:
              "Latestness benchmark must include a live web search result, not cached-only evidence.",
          },
        ]),
    ...(evidence.latestnessBenchmark.query.trim() &&
    evidence.queries.includes(evidence.latestnessBenchmark.query)
      ? []
      : [
          {
            code: "latestness_query_not_recorded" as const,
            message: "Latestness benchmark query must be recorded in the live search event log.",
          },
        ]),
    ...evidence.latestnessBenchmark.candidateIds
      .filter((candidateId) => !candidateIds.has(candidateId))
      .map((candidateId) => ({
        code: "unknown_latestness_candidate" as const,
        candidateId,
        message: `Latestness benchmark references unknown candidate ${candidateId}.`,
      })),
  ];
}

function liveDomains(candidates: readonly LiveWebSearchCandidate[]): ReadonlySet<string> {
  return new Set(
    candidates
      .filter((candidate) => candidate.mode === "live")
      .map((candidate) => domainOf(candidate.url))
      .filter((domain) => domain !== undefined),
  );
}

function metadataIssue(candidateId: string, field: string): LiveWebSearchEvidenceIssue {
  return {
    code: "missing_candidate_metadata",
    candidateId,
    message: `Search candidate ${candidateId} is missing required ${field} metadata.`,
  };
}

function isValidHttpUrl(value: string): boolean {
  return domainOf(value) !== undefined;
}

function domainOf(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.hostname : undefined;
  } catch (error) {
    if (error instanceof TypeError) return undefined;
    throw error;
  }
}
