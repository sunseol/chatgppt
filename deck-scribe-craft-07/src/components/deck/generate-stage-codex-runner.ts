import type { DeckProject, GeneratedSlide } from "@/lib/deck-types";
import type { ImageArtifactStore } from "@/lib/image-artifact-store";
import { ImageProviderRequestError } from "@/lib/image-provider-errors";
import type { CodexImageClient } from "@/lib/codex-image-provider";
import { createBrowserImageArtifactStore } from "@/lib/browser-image-artifact-store";
import { createDesktopCodexImageClient } from "@/lib/desktop-codex-image-generation";
import { runCodexLiveSlideGenerationSession } from "@/lib/live-slide-generation-session";
import type { ProviderJob, ProviderJobManager } from "@/lib/provider-job-manager";

export type CodexGenerateStageJobInput = {
  readonly project: DeckProject;
  readonly jobId: string;
  readonly manager: ProviderJobManager;
  readonly client?: CodexImageClient;
  readonly store?: ImageArtifactStore;
  readonly onJob: (job: ProviderJob) => void;
  readonly onSlides: (slides: readonly GeneratedSlide[]) => void;
  readonly onProgress: (percent: number) => void;
  readonly now?: () => number;
};

export async function runCodexGenerateStageJob(
  input: CodexGenerateStageJobInput,
): Promise<ProviderJob<readonly GeneratedSlide[]>> {
  input.onSlides(generatingSlides(input.project));
  input.onProgress(0);

  return input.manager.run(input.jobId, async (context) => {
    input.onJob(context.reportProgress({ percent: 5, message: "Codex 이미지 세션 준비 중" }));
    const result = await runCodexLiveSlideGenerationSession({
      project: input.project,
      client: input.client ?? createDesktopCodexImageClient(),
      store: input.store ?? createBrowserImageArtifactStore(),
      isCancellationRequested: context.isCancellationRequested,
      onProgress: (progress) => {
        input.onProgress(progress.percent);
        input.onJob(
          context.reportProgress({
            percent: progress.percent,
            message: `${progress.completed}/${progress.total}장 Codex 이미지 생성 완료`,
          }),
        );
      },
      now: input.now,
    });

    switch (result.kind) {
      case "blocked":
        throw new ImageProviderRequestError("provider_contract", result.issues.join(" "));
      case "ready":
        input.onSlides(result.slides);
        input.onProgress(result.progress.percent);
        input.onJob(
          context.recordPartialResult({
            kind: "live_slide_images",
            label: `${result.slides.length} Codex slide images`,
            artifactId: input.project.id,
          }),
        );
        if (result.status !== "succeeded") {
          throw new ImageProviderRequestError("unknown", failureSummary(result.failures));
        }
        return result.slides;
      default:
        return assertNever(result);
    }
  });
}

function generatingSlides(project: DeckProject): readonly GeneratedSlide[] {
  return (
    project.plan?.slides.map((slide) => ({
      number: slide.number,
      version: 1,
      status: "generating",
      imageDescriptor: "Codex image generation in progress",
    })) ?? []
  );
}

function failureSummary(
  failures: readonly {
    readonly slideNumber: number;
    readonly errorMessage: string;
  }[],
): string {
  return failures.length === 0
    ? "Codex image generation did not complete."
    : failures.map((failure) => `Slide ${failure.slideNumber}: ${failure.errorMessage}`).join(" ");
}

function assertNever(value: never): never {
  throw new Error(`Unhandled Codex generate stage result: ${String(value)}`);
}
