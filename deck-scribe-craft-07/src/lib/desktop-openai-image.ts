import { z } from "zod";
import {
  getTauriRuntime,
  type CodexAppServerSmokeError,
  type DeckforgeTauriRuntime,
} from "./desktop-app-server-bridge";
import { createImageArtifactStore, type ImageArtifactStore } from "./image-artifact-store";
import { runLiveSlideGenerationWorkflow } from "./live-slide-generation-workflow";
import { createOpenAIImageProvider, type OpenAIImageClient } from "./slide-image-provider";
import type { DeckProject } from "./deck-types";
import type { ProviderJobManager } from "./provider-job-manager";
import type { LiveSlideGenerationWorkflowResult } from "./live-slide-generation-workflow";

const DEFAULT_OPENAI_IMAGE_ACCOUNT = "default";

const OpenAIImageSecretReferenceSchema = z.object({
  storeKind: z.literal("os_keychain"),
  service: z.literal("deckforge.openai.image"),
  account: z.string().min(1),
  secretId: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
});

const OpenAIImageGenerateResponseSchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/png;base64,"),
  requestId: z.string().min(1),
  size: z.string().min(1),
  quality: z.string().min(1),
  latencyMs: z.number().int().nonnegative(),
});

const ProjectArtifactWriteEvidenceSchema = z.object({
  filePath: z.string().min(1),
  bytes: z.number().int().nonnegative(),
});

const OpenAIImageCommandErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type DesktopOpenAIImageSecretReference = Readonly<
  z.infer<typeof OpenAIImageSecretReferenceSchema>
>;

export type DesktopOpenAIImageKeySaveResult =
  | { readonly kind: "missing_bridge" }
  | { readonly kind: "completed"; readonly reference: DesktopOpenAIImageSecretReference }
  | { readonly kind: "failed"; readonly error: CodexAppServerSmokeError };

export type DesktopLiveGenerationRunnerInput = {
  readonly project: DeckProject;
  readonly manager: ProviderJobManager;
  readonly onProgress: (percent: number, message: string) => void;
  readonly isCancellationRequested: () => boolean;
};

export async function saveDesktopOpenAIImageApiKey(input: {
  readonly apiKey: string;
  readonly account?: string;
  readonly runtime?: DeckforgeTauriRuntime;
  readonly now?: () => number;
}): Promise<DesktopOpenAIImageKeySaveResult> {
  const invoke = (input.runtime ?? getTauriRuntime())?.core?.invoke;
  if (!invoke) return { kind: "missing_bridge" };

  try {
    const value = await invoke("deckforge_save_openai_image_api_key", {
      request: {
        account: input.account ?? DEFAULT_OPENAI_IMAGE_ACCOUNT,
        apiKey: input.apiKey,
        createdAt: input.now?.() ?? Date.now(),
      },
    });
    return {
      kind: "completed",
      reference: OpenAIImageSecretReferenceSchema.parse(value),
    };
  } catch (error) {
    return { kind: "failed", error: commandError(error, "openai_image_key_save_failed") };
  }
}

export function createDesktopOpenAIImageClient(input: {
  readonly account?: string;
  readonly runtime?: DeckforgeTauriRuntime;
}): OpenAIImageClient {
  return {
    async generate(request) {
      const invoke = (input.runtime ?? getTauriRuntime())?.core?.invoke;
      if (!invoke) throw new DesktopOpenAIImageError("missing_bridge", "Tauri bridge is missing.");
      const startedAt = Date.now();
      try {
        const value = await invoke("deckforge_openai_image_generate", {
          request: {
            account: input.account ?? DEFAULT_OPENAI_IMAGE_ACCOUNT,
            model: request.model,
            prompt: request.prompt,
            aspectRatio: request.aspectRatio,
            quality: "high",
          },
        });
        const response = OpenAIImageGenerateResponseSchema.parse(value);
        return {
          imageDataUrl: response.imageDataUrl,
          requestId: response.requestId,
          size: response.size,
          quality: response.quality,
          latencyMs: response.latencyMs || Date.now() - startedAt,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new DesktopOpenAIImageError("invalid_response", error.message);
        }
        const parsed = OpenAIImageCommandErrorSchema.safeParse(error);
        if (parsed.success) {
          throw new DesktopOpenAIImageError(parsed.data.code, parsed.data.message);
        }
        if (error instanceof Error) throw error;
        throw new DesktopOpenAIImageError(
          "openai_image_generate_failed",
          "OpenAI image generation failed with a non-error value.",
        );
      }
    },
  };
}

export function createDesktopProjectArtifactStore(input: {
  readonly projectId: string;
  readonly runtime?: DeckforgeTauriRuntime;
}): ImageArtifactStore {
  return createImageArtifactStore({
    async write(entry) {
      const invoke = (input.runtime ?? getTauriRuntime())?.core?.invoke;
      if (!invoke) throw new DesktopOpenAIImageError("missing_bridge", "Tauri bridge is missing.");
      const content =
        typeof entry.content === "string"
          ? { kind: "text" as const, value: entry.content }
          : { kind: "base64" as const, value: bytesToBase64(entry.content) };
      const value = await invoke("deckforge_write_project_artifact", {
        request: {
          projectId: input.projectId,
          relativePath: stripProjectPrefix(input.projectId, entry.path),
          content,
        },
      });
      ProjectArtifactWriteEvidenceSchema.parse(value);
    },
  });
}

export function createDesktopLiveSlideGenerationRunner(input: {
  readonly account?: string;
  readonly runtime?: DeckforgeTauriRuntime;
  readonly now?: () => number;
}): (runnerInput: DesktopLiveGenerationRunnerInput) => Promise<LiveSlideGenerationWorkflowResult> {
  return (runnerInput) =>
    runLiveSlideGenerationWorkflow({
      project: runnerInput.project,
      provider: createOpenAIImageProvider(
        createDesktopOpenAIImageClient({
          account: input.account,
          runtime: input.runtime,
        }),
      ),
      store: createDesktopProjectArtifactStore({
        projectId: runnerInput.project.id,
        runtime: input.runtime,
      }),
      manager: runnerInput.manager,
      createdAt: input.now?.() ?? Date.now(),
      version: (runnerInput.project.liveSlideGeneration?.version ?? 0) + 1,
      isCancellationRequested: runnerInput.isCancellationRequested,
      onProgress: (progress) =>
        runnerInput.onProgress(
          progress.percent,
          `${progress.completed}/${progress.total}장 이미지 생성 완료`,
        ),
    });
}

export function createDesktopLiveSlideGenerationRunnerIfAvailable(
  input: {
    readonly account?: string;
    readonly runtime?: DeckforgeTauriRuntime;
    readonly now?: () => number;
  } = {},
):
  | ((runnerInput: DesktopLiveGenerationRunnerInput) => Promise<LiveSlideGenerationWorkflowResult>)
  | undefined {
  const runtime = input.runtime ?? getTauriRuntime();
  if (!runtime?.core?.invoke) return undefined;
  return createDesktopLiveSlideGenerationRunner({ ...input, runtime });
}

function commandError(error: unknown, fallbackCode: string): CodexAppServerSmokeError {
  if (error instanceof z.ZodError) return { code: "invalid_response", message: error.message };
  const parsed = OpenAIImageCommandErrorSchema.safeParse(error);
  if (parsed.success) return parsed.data;
  if (error instanceof Error) return { code: fallbackCode, message: error.message };
  throw error;
}

function stripProjectPrefix(projectId: string, path: string): string {
  const prefix = `projects/${projectId}/`;
  if (!path.startsWith(prefix)) {
    throw new DesktopOpenAIImageError(
      "invalid_artifact_path",
      "Image artifact path must stay under the current project.",
    );
  }
  return path.slice(prefix.length);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export class DesktopOpenAIImageError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DesktopOpenAIImageError";
    this.code = code;
  }
}
