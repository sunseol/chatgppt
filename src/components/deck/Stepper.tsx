import { Link } from "@tanstack/react-router";
import { STEPS, stageToStep, stepIndex, isStepReachable } from "@/lib/deck-store";
import type { DeckProject, StepKey } from "@/lib/deck-types";
import { Check, Lock, AlertTriangle } from "lucide-react";

export function Stepper({ project }: { project: DeckProject }) {
  const currentStep = stageToStep(project.stage);
  const currentIdx = stepIndex(currentStep);

  return (
    <nav className="flex flex-col gap-px">
      {STEPS.map((s, i) => {
        const reachable = isStepReachable(project, s.key);
        const isCurrent = s.key === currentStep;
        const isDone = i < currentIdx;
        const invalidated = project.invalidated[s.key];
        return (
          <StepRow
            key={s.key}
            project={project}
            stepKey={s.key}
            label={s.label}
            sub={s.sub}
            index={i}
            isCurrent={isCurrent}
            isDone={isDone}
            invalidated={!!invalidated}
            reachable={reachable}
          />
        );
      })}
    </nav>
  );
}

function StepRow(props: {
  project: DeckProject;
  stepKey: StepKey;
  label: string;
  sub: string;
  index: number;
  isCurrent: boolean;
  isDone: boolean;
  invalidated: boolean;
  reachable: boolean;
}) {
  const { project, stepKey, label, sub, index, isCurrent, isDone, invalidated, reachable } = props;
  const num = String(index).padStart(2, "0");

  const content = (
    <div
      className={[
        "group flex items-start gap-3 px-4 py-3 border-l-2 transition-colors",
        isCurrent
          ? "border-accent bg-paper"
          : isDone
          ? "border-foreground/30 hover:bg-paper/60"
          : "border-transparent hover:bg-paper/40",
        !reachable ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center font-mono text-[10px]">
        {invalidated ? (
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
        ) : isDone ? (
          <Check className="h-3.5 w-3.5 text-foreground" />
        ) : !reachable ? (
          <Lock className="h-3 w-3 text-muted-foreground" />
        ) : (
          <span className="text-muted-foreground">{num}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium leading-tight">{label}</div>
        <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          {invalidated ? "재승인 필요" : sub}
        </div>
      </div>
    </div>
  );

  if (!reachable) return content;
  return (
    <Link
      to="/project/$projectId/$step"
      params={{ projectId: project.id, step: stepKey }}
    >
      {content}
    </Link>
  );
}
