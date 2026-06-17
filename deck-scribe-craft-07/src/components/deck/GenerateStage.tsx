import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ProviderJobProgressPanel } from "@/components/deck/ProviderJobProgressPanel";
import { SlidePreview } from "@/components/deck/SlidePreview";
import { EmptyAction, StageHeader } from "@/components/deck/stage-shared";
import { fakeAsync } from "@/components/deck/stage-timing";
import { invalidateDownstream, updateProject } from "@/lib/deck-store";
import type { DeckProject, GeneratedSlide } from "@/lib/deck-types";
import { mockSlides } from "@/lib/mock-ai";
import {
  createProviderJobManager,
  ProviderJobCancelledError,
  type ProviderJob,
  type ProviderJobManager,
} from "@/lib/provider-job-manager";
import {
  findRecoveredProviderJob,
  parseProviderJobRecoverySnapshot,
  providerJobRecoveryKey,
  serializeProviderJobRecoverySnapshot,
  type ProviderJobRecoverySnapshot,
} from "@/lib/provider-job-recovery";
import { Sparkles } from "lucide-react";

const GENERATE_STEP = "generate";

type GenerateRecovery = {
  readonly snapshot: ProviderJobRecoverySnapshot;
  readonly job: ProviderJob;
};

export function GenerateStage({ project }: { readonly project: DeckProject }) {
  const navigate = useNavigate();
  const initialRecovery = readGenerateRecovery(project.id);
  const [manager] = useState<ProviderJobManager>(() =>
    createProviderJobManager({
      createId: () => `${project.id}_generate_${Date.now().toString(36)}`,
      initialJobs: initialRecovery?.snapshot.jobs ?? [],
    }),
  );
  const [slides, setSlides] = useState<GeneratedSlide[] | undefined>(project.slides);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(initialRecovery?.job.progress?.percent ?? 0);
  const [job, setJob] = useState<ProviderJob | undefined>(initialRecovery?.job);
  const [recovered, setRecovered] = useState(initialRecovery !== undefined);

  const generate = async () => {
    if (!project.plan || !project.design) return;
    const queued = manager.enqueue({
      providerId: "mock",
      capability: "imageGeneration",
      description: "Generate slide images",
    });
    syncJob(project.id, manager, queued, setJob, setRecovered);
    await runGeneration(queued.id);
  };

  const retry = async () => {
    if (!project.plan || !project.design || !job) return;
    const retried = manager.retry(job.id);
    syncJob(project.id, manager, retried, setJob, setRecovered);
    await runGeneration(retried.id);
  };

  const cancel = () => {
    if (!job) return;
    const cancelled = manager.requestCancellation(job.id);
    syncJob(project.id, manager, cancelled, setJob, setRecovered);
  };

  const runGeneration = async (jobId: string) => {
    if (!project.plan || !project.design) return;
    setBusy(true);
    setProgress(0);
    const target = mockSlides(project.plan);
    const draft: GeneratedSlide[] = target.map((slide) => ({ ...slide, status: "generating" }));
    setSlides(draft);

    const completed = await manager.run(jobId, async (context) => {
      context.reportProgress({ percent: 5, message: "Preparing approved deck context" });
      for (let index = 0; index < target.length; index++) {
        if (context.isCancellationRequested()) throw new ProviderJobCancelledError(jobId);
        await fakeAsync(null, 250);
        draft[index] = target[index];
        setSlides([...draft]);
        const percent = Math.round(((index + 1) / target.length) * 100);
        setProgress(percent);
        syncJob(
          project.id,
          manager,
          context.recordPartialResult({
            kind: "slide_preview",
            label: `Slide ${index + 1} preview`,
            artifactId: `${project.id}_slide_${index + 1}`,
          }),
          setJob,
          setRecovered,
        );
        syncJob(
          project.id,
          manager,
          context.reportProgress({ percent, message: `Generated ${index + 1}/${target.length}` }),
          setJob,
          setRecovered,
        );
      }
      return target;
    });

    syncJob(project.id, manager, completed, setJob, setRecovered);
    setBusy(false);
    if (completed.status !== "succeeded") return;
    updateProject(project.id, { slides: target, stage: "SLIDE_REVIEW_PENDING" });
    invalidateDownstream(project.id, "generate");
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "review" },
    });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-8 py-12">
        <StageHeader num="06" sub="Generate · Parallel" title="슬라이드 이미지 병렬 생성" />
        {job ? (
          <ProviderJobProgressPanel
            stageLabel="슬라이드 이미지 생성"
            job={job}
            recovered={recovered}
            onCancel={cancel}
            onRetry={() => {
              void retry();
            }}
          />
        ) : null}
        {!slides ? (
          <EmptyAction
            label="Frozen Deck Context + 승인된 레이아웃으로 슬라이드 병렬 생성"
            busy={busy}
            onClick={generate}
          />
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden bg-secondary">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="font-mono text-xs text-muted-foreground">{progress}%</div>
            </div>
            <div className="grid grid-cols-3 gap-4 xl:grid-cols-4">
              {slides.map((slide) => {
                const spec = project.plan?.slides.find(
                  (planSlide) => planSlide.number === slide.number,
                );
                if (!spec || !project.design) return null;
                return (
                  <div key={slide.number} className="border border-border bg-paper">
                    <div className="aspect-video w-full bg-background">
                      {slide.status === "generating" ? (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          <Sparkles className="mr-2 h-3 w-3 animate-pulse" /> generating…
                        </div>
                      ) : (
                        <SlidePreview
                          design={project.design}
                          spec={spec}
                          slide={slide}
                          mode="image"
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                      <span className="font-mono text-muted-foreground">
                        #{String(slide.number).padStart(2, "0")}
                      </span>
                      <span className="text-muted-foreground">v{slide.version}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function syncJob(
  projectId: string,
  manager: ProviderJobManager,
  nextJob: ProviderJob,
  setJob: (job: ProviderJob) => void,
  setRecovered: (recovered: boolean) => void,
): void {
  setJob(nextJob);
  setRecovered(false);
  writeGenerateRecovery(projectId, nextJob.id, manager.snapshot());
}

function readGenerateRecovery(projectId: string): GenerateRecovery | undefined {
  if (!isBrowser()) return undefined;
  const snapshot = parseProviderJobRecoverySnapshot(
    window.localStorage.getItem(providerJobRecoveryKey(projectId, GENERATE_STEP)),
  );
  if (!snapshot) return undefined;
  const job = findRecoveredProviderJob(snapshot, snapshot.currentJobId);
  return job === undefined ? undefined : { snapshot, job };
}

function writeGenerateRecovery(
  projectId: string,
  currentJobId: string,
  jobs: readonly ProviderJob[],
): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    providerJobRecoveryKey(projectId, GENERATE_STEP),
    serializeProviderJobRecoverySnapshot({
      projectId,
      step: GENERATE_STEP,
      currentJobId,
      jobs,
    }),
  );
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}
