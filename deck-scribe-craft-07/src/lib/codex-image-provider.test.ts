import { describe, expect, test } from "bun:test";
import { createCodexImageProvider } from "./codex-image-provider";
import { encodeSolidPngDataUrl } from "./png-encoder";
import { generateSlideImage } from "./slide-image-provider";
import type { SlidePromptPackage } from "./slide-prompt-package";

describe("Codex image provider", () => {
  test("creates Codex OAuth slide image artifacts with turn provenance metadata", async () => {
    // Given
    const provider = createCodexImageProvider({
      async generate() {
        return {
          imageDataUrl: encodeSolidPngDataUrl({
            width: 1,
            height: 1,
            color: { r: 20, g: 40, b: 60, a: 255 },
          }),
          model: "gpt-image-2",
          runtime: "codex-app-server 0.141.0",
          threadId: "thread_codex_image_001",
          turnId: "turn_codex_image_001",
          latencyMs: 3_100,
          usage: { imageCount: 1 },
        };
      },
    });

    // When
    const result = await generateSlideImage({
      provider,
      package: promptPackage(),
      aspectRatio: "16:9",
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.artifact.providerId).toBe("codex");
    expect(result.artifact.request).toEqual({
      model: "gpt-image-2",
      latencyMs: 3_100,
      usage: { imageCount: 1 },
      threadId: "thread_codex_image_001",
      turnId: "turn_codex_image_001",
    });
  });
});

function promptPackage(): SlidePromptPackage {
  return {
    promptId: "slide_generation",
    promptVersion: "v1",
    promptHash: "sha256:prompt",
    bundleId: "bundle_001",
    deckContextId: "deck_context_001",
    deckContextHash: "sha256:deck",
    designSystemId: "design_001",
    slideNumber: 1,
    layoutScreenshot: "slide_001_layout.png",
    sourceMapIds: ["source_map_001"],
    textOverlayStrategy: {
      bundleId: "bundle_001",
      deckContextId: "deck_context_001",
      deckContextHash: "sha256:deck",
      slideNumber: 1,
      layoutScreenshot: "slide_001_layout.png",
      reservedOverlayLayerIds: ["title"],
      generatedBackgroundLayerIds: ["background"],
      layers: [],
      negativePromptRules: ["Do not render exact title text in the generated background."],
    },
    prompt: "Generate a clean slide background.",
  };
}
