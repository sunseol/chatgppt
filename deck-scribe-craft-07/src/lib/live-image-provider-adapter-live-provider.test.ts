import { describe, expect, test } from "bun:test";
import { generateAndStoreSlideImageArtifact } from "./live-image-provider-adapter";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import type { SlideImageProvider } from "./slide-image-provider";
import type { SlidePromptPackage } from "./slide-prompt-package";

describe("live image provider adapter live provider boundary", () => {
  test("rejects mock providers before generation or storage", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];
    const provider: SlideImageProvider = {
      id: "mock",
      async generate() {
        throw new Error("mock provider should not be called by the live adapter.");
      },
    };

    // When
    const result = await generateAndStoreSlideImageArtifact({
      provider,
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      package: promptPackage(),
      aspectRatio: "16:9",
      projectId: "project_001",
      version: 1,
      createdAt: 1_789_820_003,
    });

    // Then
    expect(result).toEqual({
      kind: "failed",
      failure: {
        providerId: "mock",
        slideNumber: 1,
        errorKind: "provider_contract",
        retryable: false,
        errorMessage: "Mock image providers cannot run through live image storage.",
        userMessage:
          "Slide 1 image generation failed: Mock image providers cannot run through live image storage. Resolve the provider issue before retrying.",
      },
    });
    expect(writes).toEqual([]);
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
