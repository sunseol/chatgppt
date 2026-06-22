import { describe, expect, test } from "bun:test";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
import {
  createDesktopCodexImageClient,
  runDesktopCodexImageGeneration,
} from "./desktop-codex-image-generation";
import { ImageProviderRequestError } from "./image-provider-errors";

describe("desktop Codex image generation", () => {
  test("maps Tauri App Server image notifications into a Codex image response", async () => {
    // Given
    const pngDataUrl = encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 24, g: 60, b: 92, a: 255 },
    });
    const base64Png = pngDataUrl.replace("data:image/png;base64,", "");
    const runtime: DeckforgeTauriRuntime = {
      core: {
        invoke: async (command, args) => {
          expect(command).toBe("deckforge_codex_app_server_structured_turn");
          expect(JSON.stringify(args).includes("Generate a clean background.")).toBe(true);
          expect(JSON.stringify(args).includes("slide_001_layout.png")).toBe(true);
          const request = structuredTurnRequest(args);
          expect(findLooseObjectSchemaPaths(request.outputSchema)).toEqual([]);
          expect(request.turnTimeoutMs).toBe(600_000);
          return {
            runtime: "codex app-server --stdio",
            threadId: "thread_codex_image",
            turnId: "turn_codex_image",
            turnCompleted: true,
            durationMs: 4_200,
            protocolLineCount: 9,
            stderrLogLineCount: 0,
            eventMethods: ["turn/started", "rawResponseItem/completed", "turn/completed"],
            notifications: [
              {
                method: "turn/started",
                params: { threadId: "thread_codex_image", turn: { id: "turn_codex_image" } },
              },
              {
                method: "rawResponseItem/completed",
                params: {
                  threadId: "thread_codex_image",
                  turnId: "turn_codex_image",
                  item: {
                    type: "image_generation_call",
                    status: "completed",
                    revised_prompt: "Generate a clean background.",
                    result: base64Png,
                  },
                },
              },
              {
                method: "turn/completed",
                params: { threadId: "thread_codex_image", turnId: "turn_codex_image" },
              },
            ],
          };
        },
      },
    };

    // When
    const result = await runDesktopCodexImageGeneration(imageRequest(), runtime);

    // Then
    expect(result).toEqual({
      kind: "completed",
      response: {
        imageDataUrl: pngDataUrl,
        model: "gpt-image-2",
        runtime: "codex app-server --stdio",
        threadId: "thread_codex_image",
        turnId: "turn_codex_image",
        latencyMs: 4_200,
        usage: { imageCount: 1 },
        revisedPrompt: "Generate a clean background.",
      },
    });
  });

  test("throws a typed provider error when the desktop bridge is unavailable", async () => {
    // Given
    const client = createDesktopCodexImageClient({});

    // When
    const error = await captureProviderError(client.generate(imageRequest()));

    // Then
    expect(error?.message).toBe("Desktop Tauri bridge is not available.");
    expect(error?.kind).toBe("provider_contract");
  });
});

function imageRequest() {
  return {
    model: "gpt-image-2",
    prompt: "Generate a clean background.",
    aspectRatio: "16:9",
    layoutReference: {
      screenshot: "slide_001_layout.png",
      mode: "composition-reference",
    },
  } as const;
}

async function captureProviderError(
  promise: Promise<unknown>,
): Promise<ImageProviderRequestError | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    if (error instanceof ImageProviderRequestError) return error;
    throw error;
  }
}

function structuredTurnRequest(args: unknown): {
  readonly outputSchema: unknown;
  readonly turnTimeoutMs?: number;
} {
  if (!isRecord(args)) throw new Error("Expected invoke args.");
  const request = args["request"];
  if (!isRecord(request)) throw new Error("Expected structured turn request.");
  return {
    outputSchema: request["outputSchema"],
    turnTimeoutMs:
      typeof request["turnTimeoutMs"] === "number" ? request["turnTimeoutMs"] : undefined,
  };
}

function findLooseObjectSchemaPaths(value: unknown, path = "$"): readonly string[] {
  if (!isRecord(value)) return [];
  const here = value["type"] === "object" && value["additionalProperties"] !== false ? [path] : [];
  return [
    ...here,
    ...Object.entries(value).flatMap(([key, child]) =>
      findLooseObjectSchemaPaths(child, `${path}.${key}`),
    ),
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
