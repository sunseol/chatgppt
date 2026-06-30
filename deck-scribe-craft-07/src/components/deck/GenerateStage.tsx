import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { GateBar } from "@/components/deck/GateBar";
import { GeneratedSlideGrid } from "@/components/deck/GeneratedSlideGrid";
import { ProviderJobProgressPanel } from "@/components/deck/ProviderJobProgressPanel";
import {
  EmptyAction,
  StageErrorBanner,
  StageHeader,
  StageScroll,
  StageShell,
} from "@/components/deck/stage-shared";
import { fakeAsync } from "@/components/deck/stage-timing";
import { resolveGenerateProgress } from "@/components/deck/generate-progress";
import { invalidateDownstream, updateProject } from "@/lib/deck-store";
import type { DeckProject, GeneratedSlide } from "@/lib/deck-types";
import {
  TARGET_IMAGE_MODEL,
  decideImageProviderFeasibility,
} from "@/lib/image-provider-feasibility";
import { createImagePathDecisionRecord } from "@/lib/image-path-decision";
import type { LiveSlideGenerationWorkflowResult } from "@/lib/live-slide-generation-workflow";
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
import {
  findRecoveredProviderJob,
  parseProviderJobRecoverySnapshot,
  providerJobRecoveryKey,
  serializeProviderJobRecoverySnapshot,
  type ProviderJobRecoverySnapshot,
} from "@/lib/provider-job-recovery";

const GENERATE_STEP = "generate";

export type GenerateStageLiveRunner = (input: {
  readonly project: DeckProject;
  readonly manager: ProviderJobManager;
  readonly onProgress: (percent: number, message: string) => void;
  readonly isCancellationRequested: () => boolean;
}) => Promise<LiveSlideGenerationWorkflowResult>;

type GenerateRecovery = {
  readonly snapshot: ProviderJobRecoverySnapshot;
  readonly job: ProviderJob;
};

export function GenerateStage({
  project,
  executionMode = defaultExecutionMode(),
  runLiveGeneration,
}: {
  readonly project: DeckProject;
  readonly executionMode?: ImageGenerationExecutionMode;
  readonly runLiveGeneration?: GenerateStageLiveRunner;
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
  const [progress, setProgress] = useState(
    initialRecovery?.job.progress?.percent ?? resolveGenerateProgress(project.slides),
  );
  const [job, setJob] = useState<ProviderJob | undefined>(initialRecovery?.job);
  const [recovered, setRecovered] = useState(initialRecovery !== undefined);
  const productionLiveRunnerAvailable =
    imageGenerationGate.executionMode === "production" && runLiveGeneration !== undefined;
  const productionRunnerCanCreateInitialDecision =
    productionLiveRunnerAvailable &&
    imageGenerationGate.kind === "blocked" &&
    imageGenerationGate.issues.every((issue) => issue.code === "missing_image_path_decision");
  const generationReady =
    imageGenerationGate.kind === "ready" || productionRunnerCanCreateInitialDecision;
  const missingLiveRunner =
    imageGenerationGate.kind === "ready" &&
    imageGenerationGate.executionMode === "production" &&
    runLiveGeneration === undefined;

  const generate = async () => {
    if (!project.plan || !project.design || !generationReady || missingLiveRunner) {
      return;
    }
    const queued = manager.enqueue({
      providerId:
        imageGenerationGate.kind === "ready" ? imageGenerationGate.providerId : "openaiImage",
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
    if (!project.plan || !project.design || !generationReady) return;
    if (productionLiveRunnerAvailable) {
      await runProductionGeneration(jobId);
      return;
    }
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

  const runProductionGeneration = async (jobId: string) => {
    if (!runLiveGeneration) return;
    setBusy(true);
    setProgress(0);
    const draft: GeneratedSlide[] =
      project.plan?.slides.map((slide) => ({
        number: slide.number,
        version: 1,
        status: "generating",
        imageDescriptor: `live-generation|${slide.role}|${slide.title}`,
      })) ?? [];
    setSlides(draft);

    const completed = await manager.run(jobId, async (context) => {
      context.reportProgress({ percent: 5, message: "라이브 이미지 생성 경로 준비" });
      const result = await runLiveGeneration({
        project,
        manager,
        onProgress: (percent, message) => {
          setProgress(percent);
          syncJob(
            project.id,
            manager,
            context.reportProgress({ percent, message }),
            setJob,
            setRecovered,
          );
        },
        isCancellationRequested: context.isCancellationRequested,
      });
      if (result.kind !== "ready") {
        throw new Error(liveGenerationFailureMessage(result));
      }
      return result;
    });

    syncJob(project.id, manager, completed, setJob, setRecovered);
    setBusy(false);
    if (completed.status !== "succeeded" || completed.output === undefined) return;
    const result = completed.output;
    const liveVersion = (project.liveSlideGeneration?.version ?? 0) + 1;
    setSlides([...result.slides]);
    setProgress(result.progress.percent);
    updateProject(project.id, {
      slides: [...result.slides],
      layers: [...result.layers],
      liveSlideGeneration: {
        version: liveVersion,
        generatedAt: Date.now(),
        artifacts: [...result.artifacts],
        storedArtifacts: [...result.storedArtifacts],
        compositions: [...result.compositions],
        providerLineage: [...result.providerLineage],
      },
      imagePathDecision: createImagePathDecisionFromLiveResult(project, result, liveVersion),
      stage: "SLIDE_REVIEW_PENDING",
    });
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
        {imageGenerationGate.kind === "blocked" && !productionRunnerCanCreateInitialDecision ? (
          <StageErrorBanner
            title="실제 이미지 경로 Lock 필요"
            message={imageGenerationGate.issues.map((issue) => issue.message).join(" ")}
          />
        ) : null}
        {missingLiveRunner ? (
          <StageErrorBanner
            title="OpenAI 이미지 transport 필요"
            message="Production 이미지 생성은 네이티브 secret-store 기반 OpenAI image transport가 연결된 뒤에만 실행할 수 있습니다. mock 경로로 대체하지 않습니다."
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
              !generationReady
                ? "실제 이미지 경로 결정 레코드가 필요합니다."
                : missingLiveRunner
                  ? "네이티브 OpenAI image transport 연결 필요"
                  : "승인한 레이아웃으로 슬라이드 이미지 생성"
            }
            busy={busy}
            disabled={!generationReady || missingLiveRunner}
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

function createImagePathDecisionFromLiveResult(
  project: DeckProject,
  result: Extract<LiveSlideGenerationWorkflowResult, { readonly kind: "ready" }>,
  liveVersion: number,
) {
  const artifact = result.artifacts[0];
  const stored = result.storedArtifacts[0];
  if (artifact === undefined || stored === undefined) return project.imagePathDecision;
  return createImagePathDecisionRecord({
    decisionId: `${project.id}_openai_image_v${liveVersion}`,
    decidedAt: Date.now(),
    feasibility: decideImageProviderFeasibility({
      codexImageCapability: "notSupported",
      apiCredential: "available",
      organizationVerification: "unknown",
    }),
    billingOwner: "openai_api_keychain_account",
    requiredPermissions: ["images.generate", `model:${TARGET_IMAGE_MODEL}`],
    organizationVerification: "unknown",
    successfulArtifact: artifact,
    binaryArtifactPath: stored.binary.path,
  });
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

function liveGenerationFailureMessage(
  result: Exclude<LiveSlideGenerationWorkflowResult, { readonly kind: "ready" }>,
): string {
  switch (result.kind) {
    case "blocked":
      return result.issues.map((issue) => issue.message).join(" ");
    case "incomplete":
      return result.failures.map((failure) => failure.userMessage).join(" ");
    default:
      return assertNever(result);
  }
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

function defaultExecutionMode(): ImageGenerationExecutionMode {
  return import.meta.env.PROD ? "production" : "development";
}

function assertNever(value: never): never {
  throw new Error(`Unhandled generate stage value: ${JSON.stringify(value)}`);
}
