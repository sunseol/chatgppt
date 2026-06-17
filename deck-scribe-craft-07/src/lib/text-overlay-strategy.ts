import type { SlideContextBundle } from "./slide-context-bundle";

export type OverlayRenderedBy =
  | "editable-text-layer"
  | "data-overlay-layer"
  | "generated-visual-background";

export interface TextOverlayStrategyLayer {
  readonly id: string;
  readonly role: string;
  readonly renderedBy: OverlayRenderedBy;
  readonly editable: boolean;
  readonly sourceIds: readonly string[];
  readonly datasetIds: readonly string[];
  readonly sourceMapIds: readonly string[];
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
}

export interface TextOverlayStrategy {
  readonly bundleId: string;
  readonly deckContextId: string;
  readonly deckContextHash: string;
  readonly slideNumber: number;
  readonly layoutScreenshot: string;
  readonly reservedOverlayLayerIds: readonly string[];
  readonly generatedBackgroundLayerIds: readonly string[];
  readonly layers: readonly TextOverlayStrategyLayer[];
  readonly negativePromptRules: readonly string[];
}

export type TextOverlayStrategyReview =
  | { readonly status: "passed"; readonly issues: readonly string[] }
  | { readonly status: "failed"; readonly issues: readonly string[] };

const EDITABLE_TEXT_ROLES: readonly string[] = [
  "title",
  "subtitle",
  "body",
  "metric",
  "caption",
  "source",
  "sectionMarker",
  "cta",
];

const DATA_OVERLAY_ROLES: readonly string[] = ["chart", "table"];

export function buildTextOverlayStrategy(bundle: SlideContextBundle): TextOverlayStrategy {
  const layers = bundle.layoutPrototype.domLayers.map((layer) => {
    const renderedBy = renderedByForRole(layer.role);
    return {
      id: layer.id,
      role: layer.role,
      renderedBy,
      editable: layer.editable,
      sourceIds: layer.sourceIds,
      datasetIds: layer.datasetIds,
      sourceMapIds: sourceMapIdsForLayer(layer, renderedBy, bundle),
      bounds: layer.bounds,
    };
  });
  return {
    bundleId: bundle.bundleId,
    deckContextId: bundle.deckContextId,
    deckContextHash: bundle.deckContextHash,
    slideNumber: bundle.slideSpec.slideNumber,
    layoutScreenshot: bundle.layoutPrototype.layoutScreenshot,
    reservedOverlayLayerIds: layers
      .filter((layer) => layer.renderedBy !== "generated-visual-background")
      .map((layer) => layer.id),
    generatedBackgroundLayerIds: layers
      .filter((layer) => layer.renderedBy === "generated-visual-background")
      .map((layer) => layer.id),
    layers,
    negativePromptRules: [
      "composition reference, not final web UI",
      "Do not render exact title, body, metric, chart, or source text.",
      "Do not invent numbers, logos, citations, charts, or source captions.",
      "Leave reserved overlay regions clean enough for editable text and data layers.",
    ],
  };
}

export function buildTextOverlayPromptAddendum(strategy: TextOverlayStrategy): string {
  return [
    "[TEXT OVERLAY STRATEGY]",
    `- Deck Context: ${strategy.deckContextId} (${strategy.deckContextHash})`,
    `- Layout reference: ${strategy.layoutScreenshot}`,
    "- Treat the HTML layout screenshot as composition reference, not final web UI.",
    "- Do not render exact title, body, metric, chart, or source text in the generated image.",
    "- Do not draw fake numbers, fake charts, fake logos, or source captions.",
    `- Reserved editable/data overlay layers: ${strategy.reservedOverlayLayerIds.join(", ")}`,
    "- Generated background may contain atmosphere, illustration, shape, texture, and photo regions only.",
  ].join("\n");
}

export function reviewTextOverlayStrategy(
  strategy: TextOverlayStrategy,
): TextOverlayStrategyReview {
  const issues = strategy.layers
    .filter((layer) => requiresSourceMapLineage(layer))
    .filter((layer) => layer.sourceMapIds.length === 0)
    .map((layer) => `Source-backed overlay ${layer.id} is missing source map ids.`);
  return issues.length === 0 ? { status: "passed", issues } : { status: "failed", issues };
}

function renderedByForRole(role: string): OverlayRenderedBy {
  if (DATA_OVERLAY_ROLES.includes(role)) return "data-overlay-layer";
  if (EDITABLE_TEXT_ROLES.includes(role)) return "editable-text-layer";
  return "generated-visual-background";
}

function sourceMapIdsForLayer(
  layer: SlideContextBundle["layoutPrototype"]["domLayers"][number],
  renderedBy: OverlayRenderedBy,
  bundle: SlideContextBundle,
): readonly string[] {
  if (renderedBy === "generated-visual-background") return [];
  if (!requiresSourceMapRole(layer.role)) return [];
  return bundle.sourceMap.sourceMapIds;
}

function requiresSourceMapLineage(layer: TextOverlayStrategyLayer): boolean {
  return (
    layer.renderedBy !== "generated-visual-background" &&
    requiresSourceMapRole(layer.role) &&
    (layer.sourceIds.length > 0 || layer.datasetIds.length > 0)
  );
}

function requiresSourceMapRole(role: string): boolean {
  return (
    role === "body" ||
    role === "metric" ||
    role === "chart" ||
    role === "table" ||
    role === "source"
  );
}
