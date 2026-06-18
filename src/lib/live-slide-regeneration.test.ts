import { describe, expect, test } from "bun:test";
import type { GeneratedSlide, SlideSpec } from "./deck-types";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import {
  approveLiveSlideRegenerationCandidate,
  buildLiveSlideRegenerationRequest,
  createLiveSlideRegenerationCandidate,
} from "./live-slide-regeneration";
import { encodeSolidPngDataUrl } from "./png-encoder";
import { createSlideRevisionRequest, type SlideRevisionRequest } from "./slide-revision-model";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("live full-slide regeneration", () => {
  test("builds a request that preserves slide spec, deck context, and design system identity", () => {
    // Given
    const revisionRequest = revisionRequestFixture();

    // When
    const result = buildLiveSlideRegenerationRequest({
      revisionRequest,
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: "project_001_image_slide_003_v1",
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.request.deckContextId).toBe("deckctx_001");
    expect(result.request.designSystemId).toBe("design_001");
    expect(result.request.mustKeep.includes("title text")).toBe(true);
    expect(result.request.mustKeep.includes("chart area size")).toBe(false);
    expect(result.request.mustChange).toEqual(["chart area size"]);
    expect(result.request.originalBackgroundArtifactId).toBe("project_001_image_slide_003_v1");
    expect(result.request.slideSpecHash.startsWith("sha256:")).toBe(true);
  });

  test("stores a new background artifact version and keeps the approved slide until approval", async () => {
    // Given
    const stored = await storedBackgrounds();
    const requestResult = buildLiveSlideRegenerationRequest({
      revisionRequest: revisionRequestFixture(),
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: stored.original.binary.artifactId,
    });
    if (requestResult.kind !== "ready") throw new Error("Expected live regeneration request.");
    const originalSlides = [approvedSlideFixture()];

    // When
    const candidateResult = createLiveSlideRegenerationCandidate({
      request: requestResult.request,
      originalSlide: approvedSlideFixture(),
      candidateBackground: stored.candidate,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateVersion: 2,
    });

    // Then
    expect(candidateResult.kind).toBe("ready");
    if (candidateResult.kind !== "ready") return;
    expect(originalSlides[0]).toEqual(approvedSlideFixture());
    expect(candidateResult.candidate.slide.status).toBe("ready");
    expect(candidateResult.candidate.slide.version).toBe(2);
    expect(candidateResult.candidate.originalBackgroundArtifactId).toBe(
      "project_001_image_slide_003_v1",
    );
    expect(candidateResult.candidate.backgroundArtifactId).toBe("project_001_image_slide_003_v2");
    expect(candidateResult.candidate.mustKeep.includes("title text")).toBe(true);
    expect(candidateResult.candidate.mustChange).toEqual(["chart area size"]);

    const approved = approveLiveSlideRegenerationCandidate(
      originalSlides,
      candidateResult.candidate,
    );
    expect(approved[0]?.status).toBe("approved");
    expect(approved[0]?.imageDescriptor.includes("project_001_image_slide_003_v2")).toBe(true);
  });

  test("blocks invalid candidates and preserves the existing approved slide", async () => {
    // Given
    const stored = await storedBackgrounds({ candidateProviderId: "mock" });
    const requestResult = buildLiveSlideRegenerationRequest({
      revisionRequest: revisionRequestFixture(),
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: stored.original.binary.artifactId,
    });
    if (requestResult.kind !== "ready") throw new Error("Expected live regeneration request.");

    // When
    const candidateResult = createLiveSlideRegenerationCandidate({
      request: requestResult.request,
      originalSlide: approvedSlideFixture(),
      candidateBackground: stored.candidate,
      candidateDeckContextId: "deckctx_999",
      candidateDesignSystemId: "design_001",
      candidateVersion: 2,
    });

    // Then
    expect(candidateResult.kind).toBe("failed");
    if (candidateResult.kind !== "failed") return;
    expect(candidateResult.preservedSlide).toEqual(approvedSlideFixture());
    expect(candidateResult.failure.issues.map((issue) => issue.code)).toEqual([
      "deck_context_mismatch",
      "mock_background_artifact",
    ]);
  });

  test("blocks candidates that reuse the approved original background artifact", async () => {
    // Given
    const stored = await storedBackgrounds({ reuseOriginalAsCandidate: true });
    const requestResult = buildLiveSlideRegenerationRequest({
      revisionRequest: revisionRequestFixture(),
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: stored.original.binary.artifactId,
    });
    if (requestResult.kind !== "ready") throw new Error("Expected live regeneration request.");

    // When
    const candidateResult = createLiveSlideRegenerationCandidate({
      request: requestResult.request,
      originalSlide: approvedSlideFixture(),
      candidateBackground: stored.candidate,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateVersion: 2,
    });

    // Then
    expect(candidateResult.kind).toBe("failed");
    if (candidateResult.kind !== "failed") return;
    expect(candidateResult.preservedSlide).toEqual(approvedSlideFixture());
    expect(candidateResult.failure.issues.map((issue) => issue.code)).toEqual([
      "background_artifact_not_new",
    ]);
  });
});

async function storedBackgrounds(
  options: {
    readonly candidateProviderId?: SlideImageArtifact["providerId"];
    readonly reuseOriginalAsCandidate?: boolean;
  } = {},
) {
  const store = createImageArtifactStore({ write: async () => undefined });
  const original = await storeSlideImageArtifact({
    store,
    projectId: "project_001",
    artifact: imageArtifact(3, "openaiImage", "img_req_original"),
    version: 1,
    createdAt: 1_789_900_001,
  });
  const candidate = options.reuseOriginalAsCandidate
    ? original
    : await storeSlideImageArtifact({
        store,
        projectId: "project_001",
        artifact: imageArtifact(3, options.candidateProviderId ?? "openaiImage", "img_req_revised"),
        version: 2,
        createdAt: 1_789_900_002,
      });
  return { original, candidate };
}

function revisionRequestFixture(): SlideRevisionRequest {
  return createSlideRevisionRequest({
    projectId: "project_001",
    instruction: "오른쪽 차트를 더 크게 만들어줘.",
    slide: approvedSlideFixture(),
    slideSpec: slideSpecFixture(),
    design: {
      id: "design_001",
      canvas: { ratio: "16:9", w: 1600, h: 900, safeMargin: { x: 80, y: 80 } },
      grid: { columns: 12, gutter: 24 },
      colors: {
        background: "#ffffff",
        textPrimary: "#111111",
        textSecondary: "#555555",
        primary: "#006adc",
        secondary: "#22aa99",
        accent: "#ffcc00",
      },
      typography: {
        titleStyle: "bold",
        bodyStyle: "regular",
        title: { style: "bold", minPx: 40, maxPx: 72 },
        body: { style: "regular", minPx: 22, maxPx: 34 },
        caption: { style: "regular", minPx: 14, maxPx: 20 },
        number: { style: "bold", minPx: 36, maxPx: 64 },
      },
      layoutRules: [],
      componentRules: [],
      visualLanguage: "clean",
      negativeRules: [],
      approvedHash: "sha256:design",
    },
    plan: {
      id: "plan_001",
      markdown: "# plan",
      slides: [slideSpecFixture()],
      approvedHash: "sha256:plan",
    },
    now: () => 1_789_900_000,
    createId: () => "rev_235",
  });
}

function approvedSlideFixture(): GeneratedSlide {
  return {
    number: 3,
    version: 1,
    status: "approved",
    imageDescriptor: "project_001_image_slide_003_v1",
  };
}

function slideSpecFixture(): SlideSpec {
  return {
    number: 3,
    title: "시장 기회",
    role: "Market",
    coreMessage: "시장이 빠르게 커진다",
    visualType: "chart",
    evidence: ["claim_001"],
    editableElements: ["title", "body", "chart", "source"],
  };
}

function imageArtifact(
  slideNumber: number,
  providerId: SlideImageArtifact["providerId"],
  requestId: string,
): SlideImageArtifact {
  return {
    providerId,
    slideNumber,
    aspectRatio: "16:9",
    canvas: { width: 1600, height: 900 },
    layoutReference: { screenshot: "slide_003_layout.png", mode: "composition-reference" },
    imageDataUrl: encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 20, g: 40, b: 60, a: 255 },
    }),
    prompt: { id: "slide_generation", version: "v1", hash: "sha256:prompt" },
    request: {
      model: "gpt-image-2",
      requestId,
      size: "1600x900",
      quality: "high",
      latencyMs: 2_000,
    },
    generatedAt: 1_789_900_000,
  };
}
