import type { GeneratedSlide } from "./deck-types";
import {
  classifyImageProviderFailure,
  type ImageProviderFailureKind,
} from "./image-provider-errors";
import { TARGET_IMAGE_MODEL } from "./image-provider-feasibility";
import { encodeSolidPngDataUrl, type RgbaColor } from "./png-encoder";
import type { ProviderUsageSummary } from "./provider-job-manager";
import type { SlidePromptPackage } from "./slide-prompt-package";

export type SlideImageAspectRatio = "16:9" | "4:3";
export type SlideImageProviderId = "mock" | "openaiImage" | "codex";

export interface SlideImageLayoutReference {
  readonly screenshot: string;
  readonly mode: "composition-reference";
}

export interface SlideImageCanvas {
  readonly width: number;
  readonly height: number;
}

export interface SlideImageRequestMetadata {
  readonly model: string;
  readonly requestId?: string;
  readonly size?: string;
  readonly quality?: string;
  readonly latencyMs?: number;
  readonly usage?: ProviderUsageSummary;
}

export interface SlideImageArtifact {
  readonly providerId: SlideImageProviderId;
  readonly slideNumber: number;
  readonly aspectRatio: SlideImageAspectRatio;
  readonly canvas: SlideImageCanvas;
  readonly layoutReference: SlideImageLayoutReference;
  readonly imageDataUrl: string;
  readonly prompt: {
    readonly id: "slide_generation";
    readonly version: string;
    readonly hash: string;
  };
  readonly request?: SlideImageRequestMetadata;
  readonly generatedAt: number;
}

export interface SlideImageProviderInput {
  readonly package: SlidePromptPackage;
  readonly aspectRatio: SlideImageAspectRatio;
}

export interface SlideImageProvider {
  readonly id: SlideImageProviderId;
  generate(input: SlideImageProviderInput): Promise<SlideImageArtifact>;
}

export interface SlideImageFailure {
  readonly providerId: SlideImageProviderId;
  readonly slideNumber: number;
  readonly errorKind: ImageProviderFailureKind;
  readonly retryable: boolean;
  readonly errorMessage: string;
  readonly userMessage: string;
}

export type SlideImageGenerationResult =
  | {
      readonly kind: "ready";
      readonly artifact: SlideImageArtifact;
      readonly slide: GeneratedSlide;
    }
  | { readonly kind: "failed"; readonly failure: SlideImageFailure };

export interface OpenAIImageClientRequest {
  readonly model: typeof TARGET_IMAGE_MODEL;
  readonly prompt: string;
  readonly aspectRatio: SlideImageAspectRatio;
  readonly layoutReference: SlideImageLayoutReference;
}

export interface OpenAIImageClientResponse {
  readonly imageDataUrl: string;
  readonly requestId?: string;
  readonly size?: string;
  readonly quality?: string;
  readonly latencyMs?: number;
  readonly usage?: ProviderUsageSummary;
}

export interface OpenAIImageClient {
  generate(request: OpenAIImageClientRequest): Promise<OpenAIImageClientResponse>;
}

export function createMockSlideImageProvider(
  options: {
    readonly now?: () => number;
  } = {},
): SlideImageProvider {
  return {
    id: "mock",
    async generate(input) {
      const color = mockColor(input.package.slideNumber);
      const preview = previewCanvas(input.aspectRatio);
      return createArtifact({
        input,
        providerId: "mock",
        imageDataUrl: encodeSolidPngDataUrl({
          width: preview.width,
          height: preview.height,
          color,
        }),
        generatedAt: options.now?.() ?? Date.now(),
      });
    },
  };
}

export function createOpenAIImageProvider(client: OpenAIImageClient): SlideImageProvider {
  return {
    id: "openaiImage",
    async generate(input) {
      const layoutReference = layoutReferenceForPackage(input.package);
      const response = await client.generate({
        model: TARGET_IMAGE_MODEL,
        prompt: input.package.prompt,
        aspectRatio: input.aspectRatio,
        layoutReference,
      });
      return createArtifact({
        input,
        providerId: "openaiImage",
        imageDataUrl: response.imageDataUrl,
        request: requestMetadata(response),
        generatedAt: Date.now(),
      });
    },
  };
}

export async function generateSlideImage(input: {
  readonly provider: SlideImageProvider;
  readonly package: SlidePromptPackage;
  readonly aspectRatio: SlideImageAspectRatio;
}): Promise<SlideImageGenerationResult> {
  try {
    const artifact = await input.provider.generate({
      package: input.package,
      aspectRatio: input.aspectRatio,
    });
    return {
      kind: "ready",
      artifact,
      slide: generatedSlideFromArtifact(artifact),
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { kind: "failed", failure: failureFromError(input.provider.id, input.package, error) };
  }
}

function createArtifact(input: {
  readonly input: SlideImageProviderInput;
  readonly providerId: SlideImageProviderId;
  readonly imageDataUrl: string;
  readonly request?: SlideImageRequestMetadata;
  readonly generatedAt: number;
}): SlideImageArtifact {
  return {
    providerId: input.providerId,
    slideNumber: input.input.package.slideNumber,
    aspectRatio: input.input.aspectRatio,
    canvas: canvasForAspect(input.input.aspectRatio),
    layoutReference: layoutReferenceForPackage(input.input.package),
    imageDataUrl: input.imageDataUrl,
    prompt: {
      id: input.input.package.promptId,
      version: input.input.package.promptVersion,
      hash: input.input.package.promptHash,
    },
    ...(input.request === undefined ? {} : { request: input.request }),
    generatedAt: input.generatedAt,
  };
}

function requestMetadata(response: OpenAIImageClientResponse): SlideImageRequestMetadata {
  return {
    model: TARGET_IMAGE_MODEL,
    ...(response.requestId === undefined ? {} : { requestId: response.requestId }),
    ...(response.size === undefined ? {} : { size: response.size }),
    ...(response.quality === undefined ? {} : { quality: response.quality }),
    ...(response.latencyMs === undefined ? {} : { latencyMs: response.latencyMs }),
    ...(response.usage === undefined ? {} : { usage: response.usage }),
  };
}

function generatedSlideFromArtifact(artifact: SlideImageArtifact): GeneratedSlide {
  return {
    number: artifact.slideNumber,
    version: 1,
    status: "ready",
    imageDescriptor: `${artifact.providerId}|${artifact.aspectRatio}|${artifact.layoutReference.screenshot}|${artifact.prompt.id}@${artifact.prompt.version}`,
    notes: "Generated visual background; editable text/chart overlays are applied later.",
  };
}

function failureFromError(
  providerId: SlideImageProviderId,
  pkg: SlidePromptPackage,
  error: unknown,
): SlideImageFailure {
  const failure = classifyImageProviderFailure(error);
  const action = failure.retryable
    ? "Retry is available."
    : "Resolve the provider issue before retrying.";
  return {
    providerId,
    slideNumber: pkg.slideNumber,
    errorKind: failure.kind,
    retryable: failure.retryable,
    errorMessage: failure.message,
    userMessage: `Slide ${pkg.slideNumber} image generation failed: ${failure.message}. ${action}`,
  };
}

function layoutReferenceForPackage(pkg: SlidePromptPackage): SlideImageLayoutReference {
  return {
    screenshot: pkg.layoutScreenshot,
    mode: "composition-reference",
  };
}

function canvasForAspect(aspectRatio: SlideImageAspectRatio): SlideImageCanvas {
  return aspectRatio === "16:9" ? { width: 1600, height: 900 } : { width: 1200, height: 900 };
}

function previewCanvas(aspectRatio: SlideImageAspectRatio): SlideImageCanvas {
  return aspectRatio === "16:9" ? { width: 160, height: 90 } : { width: 120, height: 90 };
}

function mockColor(slideNumber: number): RgbaColor {
  return {
    r: (60 + slideNumber * 23) % 255,
    g: (90 + slideNumber * 37) % 255,
    b: (130 + slideNumber * 41) % 255,
    a: 255,
  };
}
