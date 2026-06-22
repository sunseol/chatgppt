import { describe, expect, test } from "bun:test";
import type { MvpEditableLayerModel } from "./editable-layer-model";
import { composeFinalSlide } from "./final-slide-compositor";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type { SlideImageArtifact } from "./slide-image-provider";

const LIVE_BACKGROUND_HASH =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("final slide compositor storage path", () => {
  test("rejects stored background refs outside versioned project image storage", () => {
    // Given
    const input = {
      background: liveBackground(),
      layers: editableLayers(),
      backgroundArtifact: {
        artifactId: "project_001_image_slide_003_v1",
        path: "fixtures/slide_003.v1.png",
        hash: LIVE_BACKGROUND_HASH,
      },
    };

    // When
    const result = (() => {
      try {
        composeFinalSlide(input);
        return { kind: "resolved" as const };
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        return { kind: "rejected" as const, error };
      }
    })();

    // Then
    expect(result.kind).toBe("rejected");
    if (result.kind !== "rejected") return;
    expect(result.error instanceof Error).toBe(true);
    if (!(result.error instanceof Error)) return;
    expect(result.error.message).toBe(
      "Stored background artifact must target slide 3 with versioned project image storage.",
    );
  });

  test("rejects stored background refs whose artifact id version differs from the path", () => {
    // Given
    const input = {
      background: liveBackground(),
      layers: editableLayers(),
      backgroundArtifact: {
        artifactId: "project_001_image_slide_003_v1",
        path: "projects/project_001/slides/images/slide_003.v2.png",
        hash: LIVE_BACKGROUND_HASH,
      },
    };

    // When
    const result = (() => {
      try {
        composeFinalSlide(input);
        return { kind: "resolved" as const };
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        return { kind: "rejected" as const, error };
      }
    })();

    // Then
    expect(result.kind).toBe("rejected");
    if (result.kind !== "rejected") return;
    expect(result.error instanceof Error).toBe(true);
    if (!(result.error instanceof Error)) return;
    expect(result.error.message).toBe(
      "Stored background artifact must target slide 3 with versioned project image storage.",
    );
  });
});

function liveBackground(): SlideImageArtifact {
  return {
    providerId: "openaiImage",
    slideNumber: 3,
    aspectRatio: "16:9",
    canvas: { width: 1600, height: 900 },
    layoutReference: { screenshot: "layout_slide_003.png", mode: "composition-reference" },
    imageDataUrl: encodeSolidPngDataUrl({
      width: 160,
      height: 90,
      color: { r: 40, g: 90, b: 160, a: 255 },
    }),
    prompt: { id: "slide_generation", version: "v1", hash: "sha256:prompt" },
    request: { model: "gpt-image-1", requestId: "req_live_003", latencyMs: 1200 },
    generatedAt: 1_789_500_000,
  };
}

function editableLayers(): MvpEditableLayerModel {
  return {
    slideNumber: 3,
    layers: [
      {
        id: "title_3",
        sourceLayerId: "layout_title_3",
        type: "text",
        role: "title",
        bounds: { x: 100, y: 100, w: 500, h: 90 },
        editable: true,
        text: "시장 변화",
        sourceIds: [],
        datasetIds: [],
        sourceMapIds: [],
        qualityLevel: "level2",
      },
    ],
  };
}
