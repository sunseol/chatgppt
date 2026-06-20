import { describe, expect, test } from "bun:test";
import { collectCodexImageGenerationResult } from "./codex-image-result-mapper";
import { encodeSolidPngDataUrl } from "./png-encoder";

describe("Codex image result mapper", () => {
  test("maps current App Server imageGeneration items into a Codex OAuth image response", () => {
    // Given
    const pngDataUrl = encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 10, g: 30, b: 50, a: 255 },
    });
    const base64Png = pngDataUrl.replace("data:image/png;base64,", "");

    // When
    const result = collectCodexImageGenerationResult({
      runtime: "codex-app-server 0.141.0",
      durationMs: 4_200,
      notifications: [
        {
          method: "turn/started",
          params: {
            threadId: "thread_codex_image_002",
            turn: { id: "turn_codex_image_002" },
          },
        },
        {
          method: "item/completed",
          params: {
            threadId: "thread_codex_image_002",
            turnId: "turn_codex_image_002",
            item: {
              type: "imageGeneration",
              id: "ig_002",
              status: "generating",
              revisedPrompt: "Generate a clean slide background.",
              result: base64Png,
            },
          },
        },
      ],
    });

    // Then
    expect(result).toEqual({
      kind: "ready",
      response: {
        imageDataUrl: pngDataUrl,
        model: "gpt-image-2",
        runtime: "codex-app-server 0.141.0",
        threadId: "thread_codex_image_002",
        turnId: "turn_codex_image_002",
        latencyMs: 4_200,
        usage: { imageCount: 1 },
        revisedPrompt: "Generate a clean slide background.",
      },
    });
  });

  test("maps a raw image_generation_call into a Codex OAuth image response", () => {
    // Given
    const pngDataUrl = encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 20, g: 40, b: 60, a: 255 },
    });
    const base64Png = pngDataUrl.replace("data:image/png;base64,", "");

    // When
    const result = collectCodexImageGenerationResult({
      runtime: "codex-app-server 0.141.0",
      durationMs: 3_100,
      notifications: [
        {
          method: "turn/started",
          params: {
            threadId: "thread_codex_image_001",
            turn: { id: "turn_codex_image_001" },
          },
        },
        {
          method: "rawResponseItem/completed",
          params: {
            threadId: "thread_codex_image_001",
            turnId: "turn_codex_image_001",
            item: {
              type: "image_generation_call",
              id: "ig_001",
              status: "completed",
              revised_prompt: "Generate a clean slide background.",
              result: base64Png,
            },
          },
        },
      ],
    });

    // Then
    expect(result).toEqual({
      kind: "ready",
      response: {
        imageDataUrl: pngDataUrl,
        model: "gpt-image-2",
        runtime: "codex-app-server 0.141.0",
        threadId: "thread_codex_image_001",
        turnId: "turn_codex_image_001",
        latencyMs: 3_100,
        usage: { imageCount: 1 },
        revisedPrompt: "Generate a clean slide background.",
      },
    });
  });
});
