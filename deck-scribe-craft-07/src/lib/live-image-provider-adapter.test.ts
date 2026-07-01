import { describe, expect, test } from "bun:test";
import { ImageProviderRequestError } from "./image-provider-errors";
import { createOpenAIImageProvider, type OpenAIImageClientRequest } from "./slide-image-provider";
import { encodeSolidPngDataUrl } from "./png-encoder";
import { generateAndStoreSlideImageArtifact } from "./live-image-provider-adapter";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import type { SlidePromptPackage } from "./slide-prompt-package";

describe("live image provider adapter", () => {
  test("passes prompt package and layout reference to the provider before storing bytes", async () => {
    // Given
    const requests: OpenAIImageClientRequest[] = [];
    const writes: ImageArtifactStoreWrite[] = [];
    const provider = createOpenAIImageProvider({
      async generate(request) {
        requests.push(request);
        return {
          imageDataUrl: encodeSolidPngDataUrl({
            width: 1,
            height: 1,
            color: { r: 20, g: 40, b: 60, a: 255 },
          }),
          requestId: "img_req_live_001",
          size: "1600x900",
          quality: "high",
          latencyMs: 2_800,
          usage: { imageCount: 1, estimatedCostUsd: 0.08 },
        };
      },
    });

    // When
    const pkg = promptPackage();
    const result = await generateAndStoreSlideImageArtifact({
      provider,
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      package: pkg,
      aspectRatio: "16:9",
      projectId: "project_001",
      version: 3,
      createdAt: 1_789_820_000,
    });

    // Then
    expect(result.kind).toBe("ready");
    expect(requests).toEqual([
      {
        model: "gpt-image-2",
        prompt: "Generate a clean slide background.",
        outputKind: "full_presentation_slide",
        designSystemId: pkg.designSystemId,
        designConsistencyContractId: pkg.designConsistency.contractId,
        aspectRatio: "16:9",
        layoutReference: {
          screenshot: "slide_001_layout.png",
          mode: "composition-reference",
        },
      },
    ]);
    if (result.kind !== "ready") return;
    expect(result.stored.binary.path).toBe("projects/project_001/slides/images/slide_001.v3.png");
    expect(result.stored.metadata.request).toEqual({
      requestId: "img_req_live_001",
      model: "gpt-image-2",
      outputKind: "full_presentation_slide",
      designSystemId: pkg.designSystemId,
      designConsistencyContractId: pkg.designConsistency.contractId,
      size: "1600x900",
      quality: "high",
      latencyMs: 2_800,
      usage: { imageCount: 1, estimatedCostUsd: 0.08 },
    });
    expect(result.stored.provenance.fixture).toBe(false);
    expect(result.stored.provenance.requestId).toBe("img_req_live_001");
    expect(writes.map((write) => write.path)).toEqual([
      "projects/project_001/slides/images/slide_001.v3.png",
      "projects/project_001/slides/images/slide_001.v3.metadata.json",
    ]);
    expect(firstWriteBytes(writes)).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  test("returns provider failures without writing artifact bytes", async () => {
    // Given
    const writes: ImageArtifactStoreWrite[] = [];
    const provider = createOpenAIImageProvider({
      async generate() {
        throw new ImageProviderRequestError("content_policy", "content policy blocked");
      },
    });

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
      createdAt: 1_789_820_001,
    });

    // Then
    expect(result).toEqual({
      kind: "failed",
      failure: {
        providerId: "openaiImage",
        slideNumber: 1,
        errorKind: "content_policy",
        retryable: false,
        errorMessage: "content policy blocked",
        userMessage:
          "Slide 1 image generation failed: content policy blocked. Resolve the provider issue before retrying.",
      },
    });
    expect(writes).toEqual([]);
  });
});

function firstWriteBytes(writes: readonly ImageArtifactStoreWrite[]): readonly number[] {
  const first = writes[0];
  if (!first) throw new Error("Expected a binary write.");
  if (typeof first.content === "string") throw new Error("Expected binary content.");
  return [...first.content.slice(0, 8)];
}

function promptPackage(): SlidePromptPackage {
  return {
    promptId: "slide_generation",
    promptVersion: "v1",
    promptHash: "sha256:prompt",
    bundleId: "bundle_001",
    deckContextId: "deck_context_001",
    deckContextHash: "sha256:deck",
    designSystemId: "design_001",
    outputKind: "full_presentation_slide",
    designConsistency: {
      contractId: "full_slide_design_contract_fixture",
      outputKind: "full_presentation_slide",
      designSystemId: "design_001",
      canvas: {
        aspectRatio: "16:9",
        width: 1600,
        height: 900,
        safeAreaPx: { top: 72, right: 96, bottom: 72, left: 96 },
      },
      paletteFingerprint: "fixture-palette",
      typographyFingerprint: "fixture-typography",
      componentGrammar: {
        cards: "Card grammar fixture",
        nodesLines: "Node/line grammar fixture",
        icons: "Icon grammar fixture",
      },
      allowedVariation: ["layout_archetype", "hero_motif_position", "accent_emphasis"],
      forbiddenFailures: [
        "cropped_text",
        "fake_microcopy",
        "mask_leakage",
        "region_intrusion",
        "node_line_misalignment",
        "poster_only_composition",
      ],
      lockedRules: {
        headerFooter: "Header/footer template is locked across all slides",
        cards: "Card component rules are locked across all slides",
        icons: "Icon family and stroke weight are locked across all slides",
        motif: "Repeating motif is locked across all slides",
        grid: "Grid and spacing rhythm are locked across all slides",
        textDensity: "Maximum text density is locked across all slides",
      },
      promptBlock: "[DESIGN CONSISTENCY CONTRACT]\nOutput kind: full_presentation_slide",
    },
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
