import { Link } from "@tanstack/react-router";
import type { DeckProject } from "@/lib/deck-types";
import { getWorkflowStepItems, type WorkflowStepItem } from "@/lib/workflow-stepper";
import { Check, Lock, AlertTriangle } from "lucide-react";

export function Stepper({ project }: { project: DeckProject }) {
  const items = getWorkflowStepItems(project);
  return <WorkflowStepRows items={items} projectId={project.id} />;
}

export function WorkflowStepRows({
  items,
  projectId,
}: {
  items: readonly WorkflowStepItem[];
  projectId?: string;
}) {
  return (
    <nav className="grid grid-cols-2 gap-px lg:flex lg:flex-col">
      {items.map((item) => (
        <StepRow key={item.key} item={item} projectId={projectId} />
      ))}
    </nav>
  );
}

function StepRow(props: { item: WorkflowStepItem; projectId?: string }) {
  const { item, projectId } = props;
  const num = String(item.index).padStart(2, "0");

  const content = (
    <div
      aria-current={item.isCurrent ? "step" : undefined}
      className={[
        "group flex min-w-0 items-start gap-3 border-l-2 px-3 py-2 transition-colors lg:px-4 lg:py-3",
        item.isCurrent
          ? "border-accent bg-paper"
          : item.status === "completed"
            ? "border-foreground/30 hover:bg-paper/60"
            : item.status === "invalidated"
              ? "border-warning/70 bg-warning/5 hover:bg-warning/10"
              : "border-transparent hover:bg-paper/40",
        !item.reachable ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center font-mono text-[10px]">
        {item.status === "invalidated" ? (
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
        ) : item.status === "completed" ? (
          <Check className="h-3.5 w-3.5 text-foreground" />
        ) : item.status === "locked" ? (
          <Lock className="h-3 w-3 text-muted-foreground" />
        ) : (
          <span className="text-muted-foreground">{num}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium leading-tight">{item.label}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] leading-snug text-muted-foreground">
          <span className={statusClassName(item.status)}>{item.statusLabel}</span>
          <span>{item.sub}</span>
        </div>
        <div className="mt-1 hidden text-[11px] leading-snug text-muted-foreground lg:block">
          {item.detail}
        </div>
      </div>
    </div>
  );

  if (!item.reachable || !projectId) return content;
  return (
    <Link to="/project/$projectId/$step" params={{ projectId, step: item.key }}>
      {content}
    </Link>
  );
}

function statusClassName(status: WorkflowStepItem["status"]): string {
  switch (status) {
    case "available":
      return "text-accent";
    case "completed":
      return "text-foreground";
    case "current":
      return "text-accent";
    case "invalidated":
      return "text-warning";
    case "locked":
      return "text-muted-foreground";
    default:
      return assertNever(status);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected workflow step status: ${String(value)}`);
}
