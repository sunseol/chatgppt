import type { DeckProject, ResearchPack } from "./deck-types";
import {
  runDesktopProductionCodexAppServerJob,
  type DesktopProductionCodexAppServerJobInput,
} from "./desktop-codex-app-server-production-job";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import { liveResearchPackJob } from "./desktop-live-research-pack-jobs";
import {
  evaluateLiveResearchApprovalGate,
  type LiveResearchApprovalIssue,
} from "./live-research-approval-gate";
import type { ProductionTextWorkflowBridgeStatus } from "./production-text-workflow-gate";
import type { ProviderJob, ProviderJobManager } from "./provider-job-manager";
import type { StructuredCodexAccepted } from "./codex-structured-task-runner";

export type DesktopLiveResearchPackWorkflowInput = {
  readonly project: DeckProject;
  readonly jobManager: ProviderJobManager;
  readonly tauriRuntime?: DeckforgeTauriRuntime;
  readonly createdAt: number;
};

export type DesktopLiveResearchPackLaunchIssue = {
  readonly code: "missing_live_brief" | "app_server_bridge_missing";
  readonly message: string;
};

export type DesktopLiveResearchPackLaunchBlocked = {
  readonly kind: "launch_blocked";
  readonly issues: readonly DesktopLiveResearchPackLaunchIssue[];
};

export type DesktopLiveResearchPackJobFailure = {
  readonly kind: "job_failed";
  readonly stage: "research_pack";
  readonly job: ProviderJob<StructuredCodexAccepted<unknown>>;
  readonly message: string;
};

export type DesktopLiveResearchPackPatch = {
  readonly research: ResearchPack;
  readonly stage: "RESEARCH_APPROVAL_PENDING";
};

export type DesktopLiveResearchPackReady = {
  readonly kind: "ready";
  readonly patch: DesktopLiveResearchPackPatch;
  readonly summary: string;
};

export type DesktopLiveResearchPackBlocked = {
  readonly kind: "blocked";
  readonly issues: readonly LiveResearchApprovalIssue[];
  readonly patch: DesktopLiveResearchPackPatch;
  readonly summary: string;
};

export type DesktopLiveResearchPackWorkflowResult =
  | DesktopLiveResearchPackReady
  | DesktopLiveResearchPackBlocked
  | DesktopLiveResearchPackJobFailure
  | DesktopLiveResearchPackLaunchBlocked;

export async function runDesktopLiveResearchPackWorkflow(
  input: DesktopLiveResearchPackWorkflowInput,
): Promise<DesktopLiveResearchPackWorkflowResult> {
  const launchIssues = createDesktopLiveResearchPackLaunchIssues({
    project: input.project,
    appServerBridge: "available",
  });
  if (launchIssues.length > 0) return { kind: "launch_blocked", issues: launchIssues };

  const research = await runDesktopResearchPackJob(liveResearchPackJob(input));
  if (research.kind === "job_failed") return research;

  return createLiveResearchPackPatch({
    project: input.project,
    accepted: research.accepted,
  });
}

export function createDesktopLiveResearchPackLaunchIssues(input: {
  readonly project: DeckProject;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
}): readonly DesktopLiveResearchPackLaunchIssue[] {
  return [
    ...(input.project.brief?.approvedHash
      ? []
      : [
          {
            code: "missing_live_brief" as const,
            message: "조사팩 생성 전에 승인된 인터뷰 브리프가 필요합니다.",
          },
        ]),
    ...(input.appServerBridge === "available"
      ? []
      : [
          {
            code: "app_server_bridge_missing" as const,
            message: "라이브 조사팩 생성에는 데스크톱 Codex 연결이 필요합니다.",
          },
        ]),
  ];
}

type DesktopResearchPackResult =
  | { readonly kind: "accepted"; readonly accepted: StructuredCodexAccepted<ResearchPack> }
  | DesktopLiveResearchPackJobFailure;

async function runDesktopResearchPackJob(
  spec: DesktopProductionCodexAppServerJobInput<ResearchPack>,
): Promise<DesktopResearchPackResult> {
  const job = await runDesktopProductionCodexAppServerJob(spec);
  if (job.status === "succeeded" && job.output !== undefined) {
    return { kind: "accepted", accepted: job.output };
  }
  return {
    kind: "job_failed",
    stage: "research_pack",
    job,
    message: job.errorMessage ?? "Desktop Codex App Server job did not accept Research Pack.",
  };
}

function createLiveResearchPackPatch(input: {
  readonly project: DeckProject;
  readonly accepted: StructuredCodexAccepted<ResearchPack>;
}): DesktopLiveResearchPackReady | DesktopLiveResearchPackBlocked {
  const research = {
    ...input.accepted.value,
    provenanceLineage: [
      ...(input.project.research?.provenanceLineage ?? []),
      input.accepted.provenance,
    ],
  };
  const patch = { research, stage: "RESEARCH_APPROVAL_PENDING" as const };
  const gate = evaluateLiveResearchApprovalGate({
    pack: research,
    evidenceRefs: research.liveEvidenceRefs ?? [],
    provenanceLineage: research.provenanceLineage ?? [],
  });
  const summary = `Stored ${research.claims.length} claims from ${research.sources.length} live sources.`;
  if (gate.kind === "blocked") return { kind: "blocked", issues: gate.issues, patch, summary };
  return { kind: "ready", patch, summary };
}
