import { TARGET_IMAGE_MODEL } from "./image-provider-feasibility";
import type { ProviderUsageSummary } from "./provider-job-manager";
import type {
  SlideImageAspectRatio,
  SlideImageLayoutReference,
  SlideImageProvider,
  SlideImageProviderInput,
  SlideImageRequestMetadata,
} from "./slide-image-provider";

export type CodexImageClientRequest = {
  readonly model: typeof TARGET_IMAGE_MODEL;
  readonly prompt: string;
  readonly aspectRatio: SlideImageAspectRatio;
  readonly layoutReference: SlideImageLayoutReference;
};

export type CodexImageClientResponse = {
  readonly imageDataUrl: string;
  readonly model: typeof TARGET_IMAGE_MODEL;
  readonly runtime: string;
  readonly threadId: string;
  readonly turnId: string;
  readonly size?: string;
  readonly quality?: string;
  readonly latencyMs?: number;
  readonly usage?: ProviderUsageSummary;
  readonly revisedPrompt?: string;
};

export interface CodexImageClient {
  generate(request: CodexImageClientRequest): Promise<CodexImageClientResponse>;
}

export function createCodexImageProvider(
  client: CodexImageClient,
  options: {
    readonly now?: () => number;
  } = {},
): SlideImageProvider {
  return {
    id: "codex",
    async generate(input) {
      const now = options.now ?? Date.now;
      const startedAt = now();
      const layoutReference = layoutReferenceForPackage(input);
      const response = await client.generate({
        model: TARGET_IMAGE_MODEL,
        prompt: input.package.prompt,
        aspectRatio: input.aspectRatio,
        layoutReference,
      });
      const completedAt = now();
      return {
        providerId: "codex",
        slideNumber: input.package.slideNumber,
        aspectRatio: input.aspectRatio,
        canvas: canvasForAspect(input.aspectRatio),
        layoutReference,
        imageDataUrl: response.imageDataUrl,
        prompt: {
          id: input.package.promptId,
          version: input.package.promptVersion,
          hash: input.package.promptHash,
        },
        request: requestMetadata(response, completedAt - startedAt),
        generatedAt: now(),
      };
    },
  };
}

function requestMetadata(
  response: CodexImageClientResponse,
  measuredLatencyMs: number,
): SlideImageRequestMetadata {
  return {
    model: response.model,
    ...(response.size === undefined ? {} : { size: response.size }),
    ...(response.quality === undefined ? {} : { quality: response.quality }),
    latencyMs: response.latencyMs ?? measuredLatencyMs,
    ...(response.usage === undefined ? {} : { usage: response.usage }),
    threadId: response.threadId,
    turnId: response.turnId,
  };
}

function layoutReferenceForPackage(input: SlideImageProviderInput): SlideImageLayoutReference {
  return {
    screenshot: input.package.layoutScreenshot,
    mode: "composition-reference",
  };
}

function canvasForAspect(aspectRatio: SlideImageAspectRatio): {
  readonly width: number;
  readonly height: number;
} {
  return aspectRatio === "16:9" ? { width: 1600, height: 900 } : { width: 1200, height: 900 };
}
