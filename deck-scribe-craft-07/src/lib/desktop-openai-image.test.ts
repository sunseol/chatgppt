import { describe, expect, test } from "bun:test";
import {
  createDesktopOpenAIImageClient,
  createDesktopLiveSlideGenerationRunnerIfAvailable,
  createDesktopProjectArtifactStore,
  saveDesktopOpenAIImageApiKey,
} from "./desktop-openai-image";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";

describe("desktop OpenAI image bridge", () => {
  test("saves an OpenAI image API key through the native keychain command", async () => {
    // Given
    const calls: NativeCall[] = [];
    const runtime = runtimeWithCalls(calls, async () => ({
      storeKind: "os_keychain",
      service: "deckforge.openai.image",
      account: "default",
      secretId: "keychain://deckforge.openai.image/default",
      createdAt: 1_789_900_100,
    }));

    // When
    const result = await saveDesktopOpenAIImageApiKey({
      apiKey: "sk-live-secret-value",
      runtime,
      now: () => 1_789_900_100,
    });

    // Then
    expect(result.kind).toBe("completed");
    expect(calls).toEqual([
      {
        command: "deckforge_save_openai_image_api_key",
        args: {
          request: {
            account: "default",
            apiKey: "sk-live-secret-value",
            createdAt: 1_789_900_100,
          },
        },
      },
    ]);
    expect(JSON.stringify(result).includes("sk-live-secret-value")).toBe(false);
  });

  test("generates an OpenAI image through the native command without exposing authorization", async () => {
    // Given
    const calls: NativeCall[] = [];
    const runtime = runtimeWithCalls(calls, async () => ({
      imageDataUrl: "data:image/png;base64,iVBORw0KGgo=",
      requestId: "img_req_live_001",
      size: "1792x1024",
      quality: "high",
      latencyMs: 2_000,
    }));
    const client = createDesktopOpenAIImageClient({ runtime });

    // When
    const response = await client.generate({
      model: "gpt-image-2",
      prompt: "Generate a board-ready strategy slide.",
      aspectRatio: "16:9",
      layoutReference: {
        screenshot: "slide_001_layout.png",
        mode: "composition-reference",
      },
    });

    // Then
    expect(response.requestId).toBe("img_req_live_001");
    expect(calls).toEqual([
      {
        command: "deckforge_openai_image_generate",
        args: {
          request: {
            account: "default",
            model: "gpt-image-2",
            prompt: "Generate a board-ready strategy slide.",
            aspectRatio: "16:9",
            quality: "high",
          },
        },
      },
    ]);
    expect(JSON.stringify(calls).includes("Bearer")).toBe(false);
  });

  test("writes image artifacts through the native app-data artifact command", async () => {
    // Given
    const calls: NativeCall[] = [];
    const runtime = runtimeWithCalls(calls, async () => ({
      filePath:
        "/Users/example/Library/Application Support/DeckForge/projects/project_001/slides/images/slide_001.v1.png",
      bytes: 8,
    }));
    const store = createDesktopProjectArtifactStore({ projectId: "project_001", runtime });

    // When
    await store.write({
      path: "projects/project_001/slides/images/slide_001.v1.png",
      content: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    });

    // Then
    expect(calls).toEqual([
      {
        command: "deckforge_write_project_artifact",
        args: {
          request: {
            projectId: "project_001",
            relativePath: "slides/images/slide_001.v1.png",
            content: { kind: "base64", value: "iVBORw0KGgo=" },
          },
        },
      },
    ]);
  });

  test("only exposes the live slide runner when the Tauri bridge is available", () => {
    // Given
    const runtime = runtimeWithCalls([], async () => ({}));

    // When
    const missing = createDesktopLiveSlideGenerationRunnerIfAvailable({ runtime: {} });
    const available = createDesktopLiveSlideGenerationRunnerIfAvailable({ runtime });

    // Then
    expect(missing).toBe(undefined);
    expect(typeof available).toBe("function");
  });
});

type NativeCall = {
  readonly command: string;
  readonly args?: Readonly<Record<string, unknown>>;
};

function runtimeWithCalls(
  calls: NativeCall[],
  handler: (command: string, args?: Readonly<Record<string, unknown>>) => Promise<unknown>,
): DeckforgeTauriRuntime {
  return {
    core: {
      invoke: async (command, args) => {
        calls.push({ command, args });
        return handler(command, args);
      },
    },
  };
}
