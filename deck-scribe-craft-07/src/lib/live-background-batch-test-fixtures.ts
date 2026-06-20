import type { StoredSlideImageArtifact } from "./image-artifact-store";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type { SlideImageArtifact } from "./slide-image-provider";
import type { SlidePromptPackage } from "./slide-prompt-package";

export function slidePackages(): readonly SlidePromptPackage[] {
  return [1, 2, 3, 4, 5].map((slideNumber) => ({
    promptId: "slide_generation",
    promptVersion: "v1",
    promptHash: "sha256:prompt",
    bundleId: `bundle_${slideNumber}`,
    deckContextId: "deck_context_001",
    deckContextHash: "sha256:context",
    designSystemId: "design_001",
    slideNumber,
    layoutScreenshot: `slide_${String(slideNumber).padStart(2, "0")}_layout.png`,
    sourceMapIds: [],
    textOverlayStrategy: {
      bundleId: `bundle_${slideNumber}`,
      deckContextId: "deck_context_001",
      deckContextHash: "sha256:context",
      slideNumber,
      layoutScreenshot: `slide_${String(slideNumber).padStart(2, "0")}_layout.png`,
      reservedOverlayLayerIds: ["title", "body", "chart", "source"],
      generatedBackgroundLayerIds: ["background"],
      layers: [],
      negativePromptRules: [
        "Do not render exact title, body, metric, chart, or source text.",
        "Do not invent numbers, logos, citations, charts, or source captions.",
      ],
    },
    prompt: [
      "Deck Context ID: deck_context_001",
      "Design System ID: design_001",
      "Do not render exact title, body, metric, chart, or source text",
      "Layout screenshot composition reference",
    ].join("\n"),
  }));
}

export function imageArtifact(pkg: SlidePromptPackage): SlideImageArtifact {
  return {
    providerId: "openaiImage",
    slideNumber: pkg.slideNumber,
    aspectRatio: "16:9",
    canvas: { width: 1600, height: 900 },
    layoutReference: {
      screenshot: pkg.layoutScreenshot,
      mode: "composition-reference",
    },
    imageDataUrl: encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 20, g: 40, b: 60, a: 255 },
    }),
    prompt: {
      id: "slide_generation",
      version: "v1",
      hash: "sha256:prompt",
    },
    request: {
      model: "gpt-image-2",
      requestId: `img_req_${String(pkg.slideNumber).padStart(3, "0")}`,
    },
    generatedAt: 1_789_900_000 + pkg.slideNumber,
  };
}

export function withRequestId(artifact: SlideImageArtifact, requestId: string): SlideImageArtifact {
  if (!artifact.request) throw new Error("Expected request metadata.");
  return { ...artifact, request: { ...artifact.request, requestId } };
}

export function storedArtifact(artifact: SlideImageArtifact): StoredSlideImageArtifact {
  const request = artifact.request;
  if (!request) throw new Error("Expected request metadata.");
  return {
    binary: {
      artifactId: `project_001_image_slide_${String(artifact.slideNumber).padStart(3, "0")}_v1`,
      path: `projects/project_001/slides/images/slide_${String(artifact.slideNumber).padStart(
        3,
        "0",
      )}.v1.png`,
      hash: `sha256:${String(artifact.slideNumber).repeat(64).slice(0, 64)}`,
      bytes: 70,
      createdAt: 1_789_900_100 + artifact.slideNumber,
    },
    metadata: {
      path: `projects/project_001/slides/images/slide_${String(artifact.slideNumber).padStart(
        3,
        "0",
      )}.v1.metadata.json`,
      providerId: artifact.providerId,
      slideNumber: artifact.slideNumber,
      aspectRatio: artifact.aspectRatio,
      canvas: artifact.canvas,
      layoutReference: artifact.layoutReference,
      prompt: artifact.prompt,
      request,
      generatedAt: artifact.generatedAt,
    },
    provenance: {
      path: `projects/project_001/slides/images/slide_${String(artifact.slideNumber).padStart(
        3,
        "0",
      )}.v1.provenance.json`,
      artifactId: `project_001_image_slide_${String(artifact.slideNumber).padStart(3, "0")}_v1`,
      executionMode: "production",
      providerKind: artifact.providerId,
      authMode: artifact.providerId === "openaiImage" ? "api_key" : "codex_session",
      modelOrRuntime: request.model,
      promptVersion: `${artifact.prompt.id}@${artifact.prompt.version}`,
      durationMs: request.latencyMs ?? 0,
      inputArtifactIds: [artifact.prompt.hash, artifact.layoutReference.screenshot],
      fixture: false,
      ...(request.requestId === undefined ? {} : { requestId: request.requestId }),
      ...(request.threadId === undefined ? {} : { threadId: request.threadId }),
      ...(request.turnId === undefined ? {} : { turnId: request.turnId }),
    },
  };
}
