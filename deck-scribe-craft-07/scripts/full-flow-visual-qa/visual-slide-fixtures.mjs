import { encodeSolidPngDataUrl } from "../../src/lib/png-encoder.ts";
import {
  liveCompositionSvg,
  liveHash,
  liveSlideImage,
  paddedSlide,
} from "./visual-slide-rendering.mjs";

export const APPROVED_DECK_HASH =
  "sha256:ad7c0c1d8f5c4d2ea47f9bb2e1225fb2cdd6b24e172a7c7e352acbc8b51e4f09";

export const LAYOUT_PNG_DATA_URL = encodeSolidPngDataUrl({
  width: 320,
  height: 180,
  color: { r: 246, g: 241, b: 232, a: 255 },
});

export function liveImageArtifact(slideNumber) {
  const image = liveSlideImage(slideNumber);
  return {
    providerId: "openaiImage",
    slideNumber,
    aspectRatio: "16:9",
    canvas: { width: 1280, height: 720 },
    layoutReference: {
      screenshot: `projects/p_visual_flow/layouts/slide_${paddedSlide(slideNumber)}.png`,
      mode: "composition-reference",
    },
    imageDataUrl: image.dataUrl,
    prompt: {
      id: "slide_generation",
      version: "v1",
      hash: `sha256:prompt_${slideNumber}`,
    },
    request: {
      model: "gpt-image-2",
      requestId: `img_req_visual_${paddedSlide(slideNumber)}`,
    },
    generatedAt: 1_789_700_100,
  };
}

export function storedImageArtifact(slideNumber) {
  const artifact = liveImageArtifact(slideNumber);
  return {
    binary: {
      artifactId: `p_visual_flow_image_slide_${paddedSlide(slideNumber)}_v1`,
      path: `projects/p_visual_flow/slides/images/slide_${paddedSlide(slideNumber)}.v1.png`,
      hash: liveHash(slideNumber),
      bytes: 68,
      createdAt: 1_789_700_100,
    },
    metadata: {
      path: `projects/p_visual_flow/slides/images/slide_${paddedSlide(slideNumber)}.v1.metadata.json`,
      providerId: "openaiImage",
      slideNumber,
      aspectRatio: "16:9",
      canvas: artifact.canvas,
      layoutReference: artifact.layoutReference,
      prompt: artifact.prompt,
      request: artifact.request,
      generatedAt: artifact.generatedAt,
    },
    provenance: imageProvenance(slideNumber),
  };
}

export function imageProvenance(slideNumber) {
  return {
    artifactId: `p_visual_flow_image_slide_${paddedSlide(slideNumber)}_v1`,
    executionMode: "production",
    providerKind: "openaiImage",
    authMode: "api_key",
    modelOrRuntime: "gpt-image-2",
    promptVersion: "slide_generation@v1",
    durationMs: 1_000,
    inputArtifactIds: [`sha256:prompt_${slideNumber}`, "plan_frontend_qa"],
    fixture: false,
    requestId: `img_req_visual_${paddedSlide(slideNumber)}`,
  };
}

export function liveComposition(slideNumber) {
  const image = liveSlideImage(slideNumber);
  const copy = slideCopy(slideNumber);
  return {
    slideNumber,
    exportBasis: "compositor",
    canvas: { width: 1280, height: 720 },
    backgroundProviderId: "openaiImage",
    backgroundArtifact: {
      artifactId: `p_visual_flow_image_slide_${paddedSlide(slideNumber)}_v1`,
      path: `projects/p_visual_flow/slides/images/slide_${paddedSlide(slideNumber)}.v1.png`,
      hash: liveHash(slideNumber),
    },
    overlayRoles: ["title", "body", "chart", "source"],
    overlayBounds: liveOverlayBounds(slideNumber),
    svg: liveCompositionSvg({ slideNumber, imageDataUrl: image.dataUrl, ...copy }),
    previewPngDataUrl: image.dataUrl,
  };
}

export function visualLayers(slideNumber) {
  const copy = slideCopy(slideNumber);
  return {
    slideNumber,
    layers: [
      {
        id: `bg_${slideNumber}`,
        type: "shape",
        role: "background",
        bounds: { x: 0, y: 0, w: 1280, h: 720 },
        editable: false,
      },
      {
        id: `title_${slideNumber}`,
        type: "text",
        role: "title",
        text: copy.title,
        bounds: { x: 76, y: 76, w: 640, h: 92 },
        editable: true,
      },
      {
        id: `body_${slideNumber}`,
        type: "text",
        role: "body",
        text: copy.body,
        bounds: { x: 78, y: 188, w: 560, h: 118 },
        editable: true,
      },
      {
        id: `chart_${slideNumber}`,
        type: "shape",
        role: "chart",
        bounds: { x: 742, y: 134, w: 448, h: 376 },
        editable: true,
      },
      {
        id: `source_${slideNumber}`,
        type: "text",
        role: "source",
        text: copy.source,
        bounds: { x: 76, y: 610, w: 640, h: 34 },
        editable: true,
      },
    ],
  };
}

function slideCopy(slideNumber) {
  return slideNumber === 1
    ? {
        title: "Workflow bottleneck",
        body: "Checks slow approval. Gates restore flow.",
        source: "Source: approval workflow sample",
      }
    : {
        title: "Verified creation path",
        body: "Sources keep PPT editable. Final deck stays reviewable.",
        source: "Source: editable deck sample",
      };
}

function liveOverlayBounds(slideNumber) {
  return [
    { id: `title_${slideNumber}`, role: "title", bounds: { x: 76, y: 76, w: 640, h: 92 } },
    { id: `body_${slideNumber}`, role: "body", bounds: { x: 78, y: 188, w: 560, h: 118 } },
    { id: `chart_${slideNumber}`, role: "chart", bounds: { x: 742, y: 134, w: 448, h: 376 } },
    { id: `source_${slideNumber}`, role: "source", bounds: { x: 76, y: 610, w: 640, h: 34 } },
  ];
}
