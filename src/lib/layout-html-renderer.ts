import type { LayoutPrototype } from "./deck-types";
import {
  LayoutIRSchema,
  renderLayoutIrToPrototype,
  type LayoutIR,
  type LayoutIRSlide,
} from "./layout-ir";
import { enforceLayoutRendererSandbox } from "./layout-renderer-sandbox";
import { encodeSolidPngDataUrl, type RgbaColor } from "./png-encoder";

export type LocalLayoutRenderArtifacts = {
  readonly id: string;
  readonly css: string;
  readonly prototype: LayoutPrototype;
  readonly manifest: LocalLayoutRenderManifest;
  readonly slides: readonly LocalLayoutRenderedSlide[];
};

export type LocalLayoutRenderManifest = {
  readonly id: string;
  readonly slideCount: number;
  readonly canvas: LayoutIR["canvas"];
  readonly sandbox: {
    readonly externalRequests: "blocked";
    readonly tauriApi: "blocked";
    readonly scriptExecution: "blocked";
  };
  readonly files: readonly {
    readonly slideNumber: number;
    readonly htmlPath: string;
    readonly pngPath: string;
    readonly domLayersPath: string;
  }[];
};

export type LocalLayoutRenderedSlide = {
  readonly number: number;
  readonly componentType: string;
  readonly htmlPath: string;
  readonly pngPath: string;
  readonly domLayersPath: string;
  readonly html: string;
  readonly pngDataUrl: string;
  readonly width: number;
  readonly height: number;
  readonly domLayers: LayoutPrototype["slides"][number]["domLayers"];
};

export type LocalLayoutSafeRenderResult =
  | { readonly kind: "ready"; readonly artifacts: LocalLayoutRenderArtifacts }
  | { readonly kind: "failed"; readonly message: string };

const PREVIEW_WIDTH = 160;

export function renderLocalLayoutArtifacts(ir: LayoutIR): LocalLayoutRenderArtifacts {
  const parsed = LayoutIRSchema.parse(ir);
  const prototype = renderLayoutIrToPrototype(parsed);
  const css = enforceLayoutRendererSandbox(buildCss(parsed));
  const slides = parsed.slides.map((slide) =>
    renderSlideArtifacts(slide, prototype, css, parsed.canvas),
  );
  const prototypeWithThumbnails = attachThumbnails(prototype, slides);
  return {
    id: `local_render_${parsed.id}`,
    css,
    prototype: prototypeWithThumbnails,
    manifest: {
      id: `layout_manifest_${parsed.id}`,
      slideCount: slides.length,
      canvas: parsed.canvas,
      sandbox: {
        externalRequests: "blocked",
        tauriApi: "blocked",
        scriptExecution: "blocked",
      },
      files: slides.map((slide) => ({
        slideNumber: slide.number,
        htmlPath: slide.htmlPath,
        pngPath: slide.pngPath,
        domLayersPath: slide.domLayersPath,
      })),
    },
    slides,
  };
}

export function safeRenderLocalLayoutArtifacts(candidate: unknown): LocalLayoutSafeRenderResult {
  try {
    return {
      kind: "ready",
      artifacts: renderLocalLayoutArtifacts(LayoutIRSchema.parse(candidate)),
    };
  } catch (error) {
    return {
      kind: "failed",
      message: error instanceof Error ? error.message : "Layout rendering failed.",
    };
  }
}

function renderSlideArtifacts(
  slide: LayoutIRSlide,
  prototype: LayoutPrototype,
  css: string,
  canvas: LayoutIR["canvas"],
): LocalLayoutRenderedSlide {
  const prototypeSlide = prototype.slides.find((item) => item.number === slide.slideNumber);
  if (!prototypeSlide) {
    throw new Error(`Missing prototype slide ${slide.slideNumber}.`);
  }
  const width = PREVIEW_WIDTH;
  const height = Math.round((PREVIEW_WIDTH * canvas.h) / canvas.w);
  const padded = String(slide.slideNumber).padStart(2, "0");
  return {
    number: slide.slideNumber,
    componentType: slide.componentType,
    htmlPath: `slide_${padded}.html`,
    pngPath: `slide_${padded}_layout.png`,
    domLayersPath: `slide_${padded}_dom_layers.json`,
    html: enforceLayoutRendererSandbox(documentHtml(css, prototypeSlide.html)),
    pngDataUrl: encodeSolidPngDataUrl({
      width,
      height,
      color: colorForComponent(slide.componentType),
    }),
    width,
    height,
    domLayers: prototypeSlide.domLayers,
  };
}

function attachThumbnails(
  prototype: LayoutPrototype,
  slides: readonly LocalLayoutRenderedSlide[],
): LayoutPrototype {
  return {
    ...prototype,
    slides: prototype.slides.map((slide) => ({
      ...slide,
      layoutPngDataUrl: slides.find((rendered) => rendered.number === slide.number)?.pngDataUrl,
    })),
  };
}

function buildCss(ir: LayoutIR): string {
  return [
    ".deckforge-layout-stage{margin:0;background:#fff;}",
    `.deckforge-layout-slide{position:relative;width:${ir.canvas.w}px;height:${ir.canvas.h}px;overflow:hidden;}`,
    ".deckforge-layout-slide [data-layer-id]{position:absolute;box-sizing:border-box;border:1px solid rgba(0,0,0,.18);}",
    ".deckforge-layout-slide [data-layer-role='title']{left:5%;top:6%;right:5%;height:13%;}",
    ".deckforge-layout-slide [data-layer-role='source']{left:5%;bottom:5%;right:5%;height:4%;}",
    ".deckforge-layout-slide [data-layer-role='chart'],.deckforge-layout-slide [data-layer-role='visual'],.deckforge-layout-slide [data-layer-role='image']{left:42%;top:26%;right:5%;bottom:16%;}",
    ".deckforge-layout-slide [data-layer-role='body'],.deckforge-layout-slide [data-layer-role='metric'],.deckforge-layout-slide [data-layer-role='table']{left:5%;top:26%;right:5%;bottom:16%;}",
  ].join("\n");
}

function documentHtml(css: string, body: string): string {
  return [
    "<!doctype html>",
    '<html lang="ko">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<style>${css}</style>`,
    "</head>",
    '<body class="deckforge-layout-stage">',
    body,
    "</body>",
    "</html>",
  ].join("");
}

function colorForComponent(componentType: string): RgbaColor {
  const hash = [...componentType].reduce((sum, char) => (sum * 33 + char.charCodeAt(0)) >>> 0, 17);
  return {
    r: 48 + (hash & 0x3f),
    g: 72 + ((hash >> 8) & 0x3f),
    b: 96 + ((hash >> 16) & 0x3f),
    a: 255,
  };
}
