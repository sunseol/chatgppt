import type { LayoutPrototype } from "./deck-types";

type DomLayer = LayoutPrototype["slides"][number]["domLayers"][number];

type DomLayerContainer =
  | { readonly domLayers: readonly DomLayer[] }
  | { readonly slides: readonly { readonly domLayers: readonly DomLayer[] }[] };

export function countDomLayerMetadataOmissions(container: DomLayerContainer): number {
  return collectDomLayers(container).reduce((count, layer) => count + layerOmissionCount(layer), 0);
}

function collectDomLayers(container: DomLayerContainer): readonly DomLayer[] {
  if ("slides" in container) {
    return container.slides.flatMap((slide) => slide.domLayers);
  }
  return container.domLayers;
}

function layerOmissionCount(layer: DomLayer): number {
  return [
    layer.id.length > 0,
    layer.role.length > 0,
    typeof layer.editable === "boolean",
    Array.isArray(layer.sourceIds),
    Array.isArray(layer.datasetIds),
    isValidBounds(layer.bounds),
  ].filter((present) => !present).length;
}

function isValidBounds(bounds: DomLayer["bounds"]): boolean {
  return (
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.w) &&
    Number.isFinite(bounds.h) &&
    bounds.w > 0 &&
    bounds.h > 0
  );
}
