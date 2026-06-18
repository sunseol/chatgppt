import { stageToStep, stepIndex, STEPS, type DeckProject } from "@/lib/deck-types";

export function ProjectDeckThumbnail({
  project,
  compact = false,
}: {
  readonly project: DeckProject;
  readonly compact?: boolean;
}) {
  const activeIndex = Math.max(0, stepIndex(stageToStep(project.stage)));
  const slideMarkers = Array.from({ length: Math.min(Math.max(project.slideCount, 3), 6) });
  return (
    <div
      className={`overflow-hidden border border-border bg-background ${
        compact ? "h-[78px] w-[138px]" : "aspect-video w-full"
      }`}
    >
      <div className="flex h-full">
        <div className="flex w-[18%] flex-col gap-1 border-r border-border bg-secondary p-2">
          {slideMarkers.slice(0, compact ? 4 : 6).map((_, index) => (
            <div
              key={index}
              className={`h-2 border border-border ${
                index <= activeIndex % slideMarkers.length ? "bg-accent" : "bg-paper"
              }`}
            />
          ))}
        </div>
        <div className="flex flex-1 flex-col justify-between p-3">
          <div>
            <div className="h-1 w-10 bg-accent" />
            <div
              className={`mt-3 line-clamp-2 font-serif font-semibold leading-tight ${
                compact ? "text-[12px]" : "text-2xl"
              }`}
            >
              {project.name}
            </div>
            {!compact ? (
              <div className="mt-3 grid grid-cols-[1fr_72px] gap-4">
                <div className="space-y-2">
                  <div className="h-2 w-full bg-secondary" />
                  <div className="h-2 w-4/5 bg-secondary" />
                  <div className="h-2 w-2/3 bg-secondary" />
                </div>
                <div className="flex items-end gap-1 border-l border-border pl-3">
                  {[0.42, 0.72, 0.58, 0.88].map((height, index) => (
                    <div
                      key={index}
                      className={index === 3 ? "w-3 bg-accent" : "w-3 bg-foreground/25"}
                      style={{ height: `${height * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
            <span>{STEPS[activeIndex]?.label ?? "프로젝트"}</span>
            <span>{project.slideCount}장</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkflowMiniMap({ activeStep }: { readonly activeStep: DeckProject["stage"] }) {
  const activeIndex = Math.max(0, stepIndex(stageToStep(activeStep)));
  return (
    <div className="border border-border bg-background p-3">
      <div className="grid grid-cols-4 gap-2">
        {STEPS.slice(0, 8).map((step, index) => (
          <div key={step.key} className="space-y-1">
            <div
              className={`h-8 border ${
                index <= activeIndex ? "border-accent bg-accent/25" : "border-border bg-paper"
              }`}
            >
              <div className="m-1 h-1.5 bg-foreground/20" />
              <div className="mx-1 h-1 w-2/3 bg-foreground/10" />
            </div>
            <div className="truncate text-[10px] text-muted-foreground">{step.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
