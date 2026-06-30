import type { DeckProject, ResearchPack, ResearchSourceType, SourceUsePolicy } from "./deck-types";
import {
  runDesktopProductionCodexAppServerJob,
  type DesktopProductionCodexAppServerJobInput,
} from "./desktop-codex-app-server-production-job";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import { liveWebSearchEvidenceJob } from "./desktop-live-web-search-jobs";
import {
  summarizeLiveWebSearchEvidence,
  validateLiveWebSearchEvidence,
  type LiveWebSearchCandidate,
  type LiveWebSearchEvidence,
  type LiveWebSearchEvidenceIssue,
  type LiveWebSearchEvidenceSummary,
  type SourceCandidateType,
} from "./live-web-search-evidence";
import type { ProductionTextWorkflowBridgeStatus } from "./production-text-workflow-gate";
import type { ProviderJob, ProviderJobManager } from "./provider-job-manager";
import type { StructuredCodexAccepted } from "./codex-structured-task-runner";

export type DesktopLiveWebSearchWorkflowInput = {
  readonly project: DeckProject;
  readonly jobManager: ProviderJobManager;
  readonly tauriRuntime?: DeckforgeTauriRuntime;
  readonly createdAt: number;
};

export type DesktopLiveWebSearchLaunchIssue = {
  readonly code: "missing_live_brief" | "app_server_bridge_missing";
  readonly message: string;
};

export type DesktopLiveWebSearchLaunchBlocked = {
  readonly kind: "launch_blocked";
  readonly issues: readonly DesktopLiveWebSearchLaunchIssue[];
};

export type DesktopLiveWebSearchBlocked = {
  readonly kind: "blocked";
  readonly issues: readonly LiveWebSearchEvidenceIssue[];
  readonly summary: LiveWebSearchEvidenceSummary;
};

export type DesktopLiveWebSearchJobFailure = {
  readonly kind: "job_failed";
  readonly stage: "web_search";
  readonly job: ProviderJob<StructuredCodexAccepted<unknown>>;
  readonly message: string;
};

export type DesktopLiveWebSearchReady = {
  readonly kind: "ready";
  readonly evidence: LiveWebSearchEvidence;
  readonly summary: LiveWebSearchEvidenceSummary;
  readonly patch: {
    readonly research: ResearchPack;
    readonly stage: "RESEARCHING";
  };
};

export type DesktopLiveWebSearchWorkflowResult =
  | DesktopLiveWebSearchReady
  | DesktopLiveWebSearchBlocked
  | DesktopLiveWebSearchJobFailure
  | DesktopLiveWebSearchLaunchBlocked;

export async function runDesktopLiveWebSearchResearchWorkflow(
  input: DesktopLiveWebSearchWorkflowInput,
): Promise<DesktopLiveWebSearchWorkflowResult> {
  const launchIssues = createDesktopLiveWebSearchLaunchIssues({
    project: input.project,
    appServerBridge: "available",
  });
  if (launchIssues.length > 0) return { kind: "launch_blocked", issues: launchIssues };

  const search = await runDesktopWebSearchJob(liveWebSearchEvidenceJob(input));
  if (search.kind === "job_failed") return search;

  return createLiveWebSearchResearchPatch({
    project: input.project,
    accepted: search.accepted,
    createdAt: input.createdAt,
  });
}

export function createDesktopLiveWebSearchLaunchIssues(input: {
  readonly project: DeckProject;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
}): readonly DesktopLiveWebSearchLaunchIssue[] {
  return [
    ...(input.project.brief?.approvedHash
      ? []
      : [
          {
            code: "missing_live_brief" as const,
            message: "Live web search requires an approved interview brief.",
          },
        ]),
    ...(input.appServerBridge === "available"
      ? []
      : [
          {
            code: "app_server_bridge_missing" as const,
            message: "Desktop App Server bridge is required for live web search.",
          },
        ]),
  ];
}

function createLiveWebSearchResearchPatch(input: {
  readonly project: DeckProject;
  readonly accepted: StructuredCodexAccepted<LiveWebSearchEvidence>;
  readonly createdAt: number;
}): DesktopLiveWebSearchReady | DesktopLiveWebSearchBlocked {
  const evidence = withDurableTurnId(input.accepted.value, input.accepted.provenance.turnId);
  const report = validateLiveWebSearchEvidence(evidence);
  const summary = summarizeLiveWebSearchEvidence(evidence, report);
  if (!report.valid) return { kind: "blocked", issues: report.issues, summary };

  return {
    kind: "ready",
    evidence,
    summary,
    patch: {
      stage: "RESEARCHING",
      research: buildResearchPack(input.project, evidence, input.createdAt, input.accepted),
    },
  };
}

type DesktopWebSearchResult =
  | { readonly kind: "accepted"; readonly accepted: StructuredCodexAccepted<LiveWebSearchEvidence> }
  | DesktopLiveWebSearchJobFailure;

async function runDesktopWebSearchJob(
  spec: DesktopProductionCodexAppServerJobInput<LiveWebSearchEvidence>,
): Promise<DesktopWebSearchResult> {
  const job = await runDesktopProductionCodexAppServerJob(spec);
  if (job.status === "succeeded" && job.output !== undefined) {
    return { kind: "accepted", accepted: job.output };
  }
  return {
    kind: "job_failed",
    stage: "web_search",
    job,
    message: job.errorMessage ?? "Desktop Codex App Server job did not accept web_search.",
  };
}

function withDurableTurnId(
  evidence: LiveWebSearchEvidence,
  turnId: string | undefined,
): LiveWebSearchEvidence {
  return {
    ...evidence,
    researchTurnId: turnId ?? evidence.researchTurnId,
  };
}

function buildResearchPack(
  project: DeckProject,
  evidence: LiveWebSearchEvidence,
  createdAt: number,
  accepted: StructuredCodexAccepted<LiveWebSearchEvidence>,
): ResearchPack {
  return {
    id: `${project.id}_research_live_search`,
    sources: evidence.candidates.map((candidate) => sourceFromCandidate(candidate, createdAt)),
    claims: [],
    datasets: [],
    charts: [],
    factCheckReport: {
      summary: `Live web search discovered ${evidence.candidates.length} source candidates.`,
      generatedAt: createdAt,
      fatalIssueCount: 0,
      issues: [],
      uncertainItems: [],
    },
    webSearchEvidence: evidence,
    provenanceLineage: [...(project.research?.provenanceLineage ?? []), accepted.provenance],
  };
}

function sourceFromCandidate(candidate: LiveWebSearchCandidate, createdAt: number) {
  return {
    id: candidate.id,
    title: candidate.title,
    publisher: publisherFromUrl(candidate.url),
    year: new Date(createdAt).getUTCFullYear(),
    grade: "A" as const,
    sourceType: sourceTypeForCandidate(candidate.sourceCandidateType),
    usePolicy: candidateUsePolicy(candidate.sourceCandidateType),
    url: candidate.url,
  };
}

function sourceTypeForCandidate(candidateType: SourceCandidateType): ResearchSourceType {
  switch (candidateType) {
    case "official":
      return "government";
    case "dataset":
      return "original_data";
    case "primary":
      return "research";
    case "secondary":
      return "industry";
    default:
      return assertNever(candidateType);
  }
}

function candidateUsePolicy(candidateType: SourceCandidateType): SourceUsePolicy {
  return candidateType === "secondary" ? "allowed" : "priority";
}

function publisherFromUrl(value: string): string {
  try {
    return new URL(value).hostname;
  } catch (error) {
    if (error instanceof TypeError) return "unknown";
    throw error;
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected source candidate type: ${String(value)}`);
}
