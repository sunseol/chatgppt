import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { GateBar } from "@/components/deck/GateBar";
import { GeneratedSlideGrid } from "@/components/deck/GeneratedSlideGrid";
import { ProviderJobProgressPanel } from "@/components/deck/ProviderJobProgressPanel";
import { EmptyAction, StageHeader, StageScroll, StageShell } from "@/components/deck/stage-shared";
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
      description: "슬라이드 이미지 생성",
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
      context.reportProgress({ percent: 5, message: "승인한 레이아웃을 준비하는 중" });
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
          context.reportProgress({ percent, message: `${index + 1}/${target.length}장 생성 완료` }),
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
  };

  const openReview = () => {
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "review" },
    });
  };

  const readyForReview = slides?.every((slide) => slide.status === "ready") ?? false;

  return (
    <StageShell>
      <StageScroll className="mx-auto max-w-6xl px-8">
        <StageHeader num="06" sub="Generate" title="슬라이드 이미지 생성" />
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
            label="승인한 레이아웃으로 슬라이드 이미지 생성"
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
            <GeneratedSlideGrid project={project} slides={slides} />
          </>
        )}
      </StageScroll>
      <GateBar
        hint={readyForReview ? "생성이 끝났습니다. 결과를 확인한 뒤 검토로 이동하세요." : ""}
        approve={
          slides
            ? {
                label: "검토로 이동",
                onClick: openReview,
                disabled: !readyForReview,
              }
            : undefined
        }
      />
    </StageShell>
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
