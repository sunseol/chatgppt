import type { GeneratedSlide, SlideSpec } from "./deck-types";
import type { LiveSlideRegenerationRequest } from "./live-slide-regeneration";
import { encodeSolidPngDataUrl } from "./png-encoder";
import { createSlideRevisionRequest, type SlideRevisionRequest } from "./slide-revision-model";
import type { SlideImageArtifact } from "./slide-image-provider";

type SlideImageArtifactFixtureOptions = {
  readonly slideNumber?: number;
  readonly providerId?: SlideImageArtifact["providerId"];
  readonly omitRequestId?: true;
  readonly requestId?: string;
};

export function liveRegenerationRequestFixture(
  options: {
    readonly originalBackgroundArtifactId?: string;
    readonly originalBackgroundRequestId?: string;
  } = {},
): LiveSlideRegenerationRequest {
  return {
    requestId: "rev_235",
    slideNumber: 3,
    originalSlideVersion: 1,
    deckContextId: "deckctx_001",
    designSystemId: "design_001",
    slidePlanId: "plan_001",
    slideSpecHash: "sha256:slide-spec",
    editInstruction: "차트를 더 크게",
    mustKeep: ["title text"],
    mustChange: ["chart area size"],
    originalBackgroundArtifactId:
      options.originalBackgroundArtifactId ?? "project_001_image_slide_003_v0",
    originalBackgroundRequestId: options.originalBackgroundRequestId ?? "img_req_original",
  };
}

export function revisionRequestFixture(): SlideRevisionRequest {
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

export function approvedSlideFixture(): GeneratedSlide {
  return {
    number: 3,
    version: 1,
    status: "approved",
    imageDescriptor: "project_001_image_slide_003_v1",
  };
}

export function slideSpecFixture(): SlideSpec {
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

export function slideImageArtifactFixture(
  options: SlideImageArtifactFixtureOptions = {},
): SlideImageArtifact {
  return {
    providerId: options.providerId ?? "openaiImage",
    slideNumber: options.slideNumber ?? 3,
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
      ...(options.omitRequestId === true
        ? {}
        : { requestId: options.requestId ?? "img_req_revised" }),
      size: "1600x900",
      quality: "high",
      latencyMs: 2_000,
    },
    generatedAt: 1_789_900_000,
  };
}
