import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createProductionTextWorkflowGate,
  type ProductionTextWorkflowBridgeStatus,
  type ProductionTextWorkflowGate,
} from "@/lib/production-text-workflow-gate";
import type { DeckProject, StepKey } from "@/lib/deck-types";

export type ProductionTextWorkflowPanelProps = {
  readonly project: DeckProject;
  readonly step: StepKey;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
  readonly runStatus?: ProductionTextWorkflowRunStatus;
  readonly onRun?: () => void;
};

export type ProductionTextWorkflowRunStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "running"; readonly message: string }
  | { readonly kind: "succeeded"; readonly message: string }
  | { readonly kind: "failed"; readonly message: string };

export function ProductionTextWorkflowPanel({
  project,
  step,
  appServerBridge,
  runStatus = { kind: "idle" },
  onRun,
}: ProductionTextWorkflowPanelProps) {
  const gate = createProductionTextWorkflowGate({ project, step, appServerBridge });
  if (gate.kind === "not_applicable") return null;
  const isRunning = runStatus.kind === "running";

  return (
    <section className="mt-6 border border-border bg-paper p-5 text-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-medium">{gate.title}</div>
          <div className="mt-2 text-muted-foreground">
            {gate.kind === "ready"
              ? "Ready to launch"
              : "Live App Server execution is blocked until every requirement is satisfied."}
          </div>
        </div>
        <Button
          type="button"
          disabled={gate.kind !== "ready" || isRunning || onRun === undefined}
          onClick={onRun}
          className="shrink-0 bg-foreground text-background hover:bg-foreground/90"
        >
          <Play className="h-4 w-4" />
          {isRunning ? "Running live turns" : gate.actionLabel}
        </Button>
      </div>
      <WorkflowStages gate={gate} />
      {runStatus.kind !== "idle" ? <RunStatusDetails status={runStatus} /> : null}
      {gate.kind === "ready" ? <ReadyDetails gate={gate} /> : <BlockedDetails gate={gate} />}
    </section>
  );
}

function WorkflowStages({
  gate,
}: {
  readonly gate: Exclude<ProductionTextWorkflowGate, { readonly kind: "not_applicable" }>;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {gate.requiredStages.map((stage) => (
        <span
          key={stage}
          className="border border-border bg-background px-2 py-1 font-mono text-xs"
        >
          {stage}
        </span>
      ))}
    </div>
  );
}

function ReadyDetails({
  gate,
}: {
  readonly gate: Extract<ProductionTextWorkflowGate, { readonly kind: "ready" }>;
}) {
  return (
    <div className="mt-4 border border-border bg-background p-3 text-xs text-muted-foreground">
      patch targets: {gate.patchTargets.join(", ")}
    </div>
  );
}

function BlockedDetails({
  gate,
}: {
  readonly gate: Extract<ProductionTextWorkflowGate, { readonly kind: "blocked" }>;
}) {
  return (
    <ul className="mt-4 space-y-2">
      {gate.issues.map((issue) => (
        <li key={issue.code} className="border border-border bg-background p-3">
          <div className="font-mono text-xs">{issue.code}</div>
          <div className="mt-1 text-muted-foreground">{issue.message}</div>
        </li>
      ))}
    </ul>
  );
}

function RunStatusDetails({
  status,
}: {
  readonly status: Exclude<ProductionTextWorkflowRunStatus, { readonly kind: "idle" }>;
}) {
  return (
    <div className="mt-4 border border-border bg-background p-3 text-xs text-muted-foreground">
      {status.message}
    </div>
  );
}
