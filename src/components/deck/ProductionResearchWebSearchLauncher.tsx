import { useState } from "react";
import { updateProject } from "@/lib/deck-store";
import type { DeckProject } from "@/lib/deck-types";
import {
  createDesktopLiveResearchPackLaunchIssues,
  runDesktopLiveResearchPackWorkflow,
  type DesktopLiveResearchPackLaunchIssue,
} from "@/lib/desktop-live-research-pack-workflow";
import { createProviderJobManager } from "@/lib/provider-job-manager";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";

export type ProductionResearchWebSearchLauncherProps = {
  readonly project: DeckProject;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
};

type ResearchWebSearchRunStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "running"; readonly message: string }
  | { readonly kind: "succeeded"; readonly message: string }
  | { readonly kind: "failed"; readonly message: string };

export function ProductionResearchWebSearchLauncher({
  project,
  appServerBridge,
}: ProductionResearchWebSearchLauncherProps) {
  const [runStatus, setRunStatus] = useState<ResearchWebSearchRunStatus>({ kind: "idle" });
  const [manager] = useState(() =>
    createProviderJobManager({
      createId: () => `${project.id}_research_${Date.now().toString(36)}`,
    }),
  );
  const launchIssues = createDesktopLiveResearchPackLaunchIssues({ project, appServerBridge });
  const canRun = launchIssues.length === 0 && runStatus.kind !== "running";

  const runSearch = () => {
    if (!canRun) return;
    void runLiveResearchPack(project, manager, setRunStatus);
  };

  return (
    <section className="mt-6 border border-border bg-paper p-5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium">실제 조사 실행</div>
          <div className="mt-1 text-muted-foreground">
            승인된 브리프를 바탕으로 출처, 주장, 데이터셋을 생성합니다.
          </div>
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={!canRun}
          className="border border-foreground px-4 py-2 text-xs font-medium uppercase disabled:cursor-not-allowed disabled:opacity-40"
        >
          {runStatus.kind === "running" ? "조사팩 생성 중" : "조사팩 생성 시작"}
        </button>
      </div>
      {launchIssues.length > 0 ? <ResearchWebSearchIssueList issues={launchIssues} /> : null}
      {runStatus.kind !== "idle" ? (
        <div className="mt-4 border border-border bg-background p-3">
          <div className="font-mono text-xs">{runStatus.kind}</div>
          <div className="mt-1 text-muted-foreground">{runStatus.message}</div>
        </div>
      ) : null}
    </section>
  );
}

async function runLiveResearchPack(
  project: DeckProject,
  jobManager: ReturnType<typeof createProviderJobManager>,
  setRunStatus: (status: ResearchWebSearchRunStatus) => void,
): Promise<void> {
  setRunStatus({ kind: "running", message: "라이브 조사팩을 생성하는 중입니다." });
  try {
    const result = await runDesktopLiveResearchPackWorkflow({
      project,
      jobManager,
      createdAt: Date.now(),
    });
    switch (result.kind) {
      case "ready":
        updateProject(project.id, result.patch);
        setRunStatus({ kind: "succeeded", message: result.summary });
        return;
      case "launch_blocked":
        setRunStatus({ kind: "failed", message: issueMessage(result.issues) });
        return;
      case "blocked":
        updateProject(project.id, result.patch);
        setRunStatus({
          kind: "failed",
          message: `${result.summary} ${result.issues.map((issue) => issue.message).join(" ")}`,
        });
        return;
      case "job_failed":
        setRunStatus({ kind: "failed", message: result.message });
        return;
      default:
        return assertNever(result);
    }
  } catch (error) {
    if (error instanceof Error) {
      setRunStatus({ kind: "failed", message: error.message });
      return;
    }
    throw error;
  }
}

function ResearchWebSearchIssueList({
  issues,
}: {
  readonly issues: readonly DesktopLiveResearchPackLaunchIssue[];
}) {
  return (
    <ul className="mt-4 space-y-2">
      {issues.map((issue) => (
        <li key={issue.code} className="border border-border bg-background p-3">
          <div className="font-mono text-xs">{issue.code}</div>
          <div className="mt-1 text-muted-foreground">{issue.message}</div>
        </li>
      ))}
    </ul>
  );
}

function issueMessage(issues: readonly DesktopLiveResearchPackLaunchIssue[]): string {
  return issues.map((issue) => issue.message).join(" ");
}

function assertNever(value: never): never {
  throw new Error(`Unhandled live Research Pack result: ${JSON.stringify(value)}`);
}
