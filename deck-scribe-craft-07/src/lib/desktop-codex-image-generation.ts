import type {
  CodexImageClient,
  CodexImageClientRequest,
  CodexImageClientResponse,
} from "./codex-image-provider";
import { collectCodexImageGenerationResult } from "./codex-image-result-mapper";
import {
  runDesktopCodexAppServerStructuredTurn,
  type CodexAppServerSmokeError,
  type DeckforgeTauriRuntime,
  type DesktopCodexAppServerStructuredTurnRequest,
} from "./desktop-app-server-bridge";
import { ImageProviderRequestError } from "./image-provider-errors";

const IMAGE_TURN_MODEL = "gpt-5.4";
const IMAGE_TURN_TIMEOUT_MS = 600_000;

const IMAGE_GENERATION_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: { type: "string" },
  },
} as const;

export type DesktopCodexImageGenerationResult =
  | { readonly kind: "missing_bridge" }
  | { readonly kind: "completed"; readonly response: CodexImageClientResponse }
  | { readonly kind: "failed"; readonly error: CodexAppServerSmokeError };

export async function runDesktopCodexImageGeneration(
  request: CodexImageClientRequest,
  runtime?: DeckforgeTauriRuntime,
): Promise<DesktopCodexImageGenerationResult> {
  const turnResult = await runDesktopCodexAppServerStructuredTurn(
    buildDesktopImageTurnRequest(request),
    runtime,
  );

  switch (turnResult.kind) {
    case "missing_bridge":
      return { kind: "missing_bridge" };
    case "failed":
      return { kind: "failed", error: turnResult.error };
    case "completed": {
      const imageResult = collectCodexImageGenerationResult({
        notifications: turnResult.evidence.notifications,
        runtime: turnResult.evidence.runtime,
        durationMs: turnResult.evidence.durationMs,
      });
      if (imageResult.kind === "blocked") {
        return {
          kind: "failed",
          error: {
            code: "invalid_image_generation_evidence",
            message: imageResult.issues.join(" "),
          },
        };
      }
      return { kind: "completed", response: imageResult.response };
    }
    default:
      return assertNever(turnResult);
  }
}

export function createDesktopCodexImageClient(runtime?: DeckforgeTauriRuntime): CodexImageClient {
  return {
    async generate(request) {
      const result = await runDesktopCodexImageGeneration(request, runtime);
      switch (result.kind) {
        case "completed":
          return result.response;
        case "missing_bridge":
          throw new ImageProviderRequestError(
            "provider_contract",
            "Desktop Tauri bridge is not available.",
          );
        case "failed":
          throw new ImageProviderRequestError("provider_contract", result.error.message);
        default:
          return assertNever(result);
      }
    },
  };
}

function buildDesktopImageTurnRequest(
  request: CodexImageClientRequest,
): DesktopCodexAppServerStructuredTurnRequest {
  return {
    prompt: [
      "Generate one production slide image using the signed-in Codex image generation capability.",
      "Do not use OpenAI API keys or external bearer credentials.",
      `Target image model: ${request.model}`,
      `Aspect ratio: ${request.aspectRatio}`,
      `Layout reference screenshot: ${request.layoutReference.screenshot}`,
      `Layout reference mode: ${request.layoutReference.mode}`,
      "",
      "[SLIDE IMAGE PROMPT]",
      request.prompt,
      "",
      'After the image generation call completes, return {"status":"image_generated"}.',
    ].join("\n"),
    outputSchema: IMAGE_GENERATION_OUTPUT_SCHEMA,
    model: IMAGE_TURN_MODEL,
    networkAccess: false,
    turnTimeoutMs: IMAGE_TURN_TIMEOUT_MS,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled desktop Codex image generation result: ${String(value)}`);
}
