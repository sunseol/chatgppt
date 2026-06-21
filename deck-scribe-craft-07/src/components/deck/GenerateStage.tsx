import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { GateBar } from "@/components/deck/GateBar";
import { GeneratedSlideGrid } from "@/components/deck/GeneratedSlideGrid";
import { ProviderJobProgressPanel } from "@/components/deck/ProviderJobProgressPanel";
import { runCodexGenerateStageJob } from "@/components/deck/generate-stage-codex-runner";
import {
  EmptyAction,
  StageErrorBanner,
  StageHeader,
  StageScroll,
  StageShell,
} from "@/components/deck/stage-shared";
import { fakeAsync } from "@/components/deck/stage-timing";
import { invalidateDownstream, updateProject } from "@/lib/deck-store";
import type { DeckProject, GeneratedSlide } from "@/lib/deck-types";
import { readGenerateRecovery, writeGenerateRecovery } from "@/lib/generate-stage-recovery";
import { confirmAndPersistLiveImageBilling } from "@/lib/live-image-billing-confirmation";
import { mockSlides } from "@/lib/mock-ai";
import {
  createProductionImageGenerationGate,
  type ImageGenerationExecutionMode,
} from "@/lib/production-image-generation-gate";
import {
  createProviderJobManager,
  ProviderJobCancelledError,
  type ProviderJob,
  type ProviderJobManager,
} from "@/lib/provider-job-manager";

export function GenerateStage({
  project,
  executionMode = defaultExecutionMode(),
}: {
  readonly project: DeckProject;
  readonly executionMode?: ImageGenerationExecutionMode;
}) {
  const navigate = useNavigate();
  const imageGenerationGate = createProductionImageGenerationGate({
    executionMode,
    imagePathDecision: project.imagePathDecision,
  });
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
    if (!project.plan || !project.design || imageGenerationGate.kind !== "ready") return;
    const queued = manager.enqueue({
      providerId: imageGenerationGate.providerId,
      capability: "imageGeneration",
      description: "슬라이드 이미지 생성",
    });
    if (imageGenerationGate.providerId === "codex") {
      const confirmation = confirmAndPersistLiveImageBilling({
        projectId: project.id,
        jobId: queued.id,
        providerId: imageGenerationGate.providerId,
      });
      if (confirmation.kind !== "confirmed") {
        const cancelled = await manager.run(queued.id, async () => {
          throw new ProviderJobCancelledError(queued.id);
        });
        syncJob(project.id, manager, cancelled, setJob, setRecovered);
        return;
      }
      syncJob(
        project.id,
        manager,
        manager.recordUsageSummary(queued.id, {
          imageCount: project.plan.slides.length,
          imageBillingDisclosure: confirmation.disclosure,
        }),
        setJob,
        setRecovered,
      );
    } else {
      syncJob(project.id, manager, queued, setJob, setRecovered);
    }
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
    if (!project.plan || !project.design || imageGenerationGate.kind !== "ready") return;
    setBusy(true);
    setProgress(0);
    if (imageGenerationGate.providerId === "codex") {
      const completed = await runCodexGenerateStageJob({
        project,
        jobId,
        manager,
        onJob: (nextJob) => syncJob(project.id, manager, nextJob, setJob, setRecovered),
        onSlides: (nextSlides) => setSlides([...nextSlides]),
        onProgress: setProgress,
      });
      syncJob(project.id, manager, completed, setJob, setRecovered);
      setBusy(false);
      if (completed.status !== "succeeded" || completed.output === undefined) return;
      updateProject(project.id, { slides: [...completed.output], stage: "SLIDE_REVIEW_PENDING" });
      invalidateDownstream(project.id, "generate");
      return;
    }
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
        {imageGenerationGate.kind === "blocked" ? (
          <StageErrorBanner
            title="실제 이미지 경로 Lock 필요"
            message={imageGenerationGate.issues.map((issue) => issue.message).join(" ")}
          />
        ) : null}
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
            label={
              imageGenerationGate.kind === "blocked"
                ? "실제 이미지 경로 결정 레코드가 필요합니다."
                : "승인한 레이아웃으로 슬라이드 이미지 생성"
            }
            busy={busy}
            disabled={imageGenerationGate.kind === "blocked"}
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
  writeGenerateRecovery({
    projectId,
    currentJobId: nextJob.id,
    jobs: manager.snapshot(),
  });
}

function defaultExecutionMode(): ImageGenerationExecutionMode {
  return import.meta.env.PROD ? "production" : "development";
}
