import type { DesignSystem, EditableLayerModel } from "./deck-types";

type FigmaLayerBounds = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

type FigmaPackageLayer =
  | {
      readonly id: string;
      readonly kind: "text";
      readonly editable: true;
      readonly text: string;
      readonly bounds: FigmaLayerBounds;
    }
  | {
      readonly id: string;
      readonly kind: "shape";
      readonly editable: true;
      readonly fill: string;
      readonly bounds: FigmaLayerBounds;
    }
  | {
      readonly id: string;
      readonly kind: "fallback";
      readonly editable: false;
      readonly reason: string;
      readonly bounds: FigmaLayerBounds;
    };

export type FigmaPackage = {
  readonly manifest: {
    readonly format: "deckforge_figma_package";
    readonly projectId: string;
    readonly exportedAt: number;
    readonly ownership: "deckforge_local_contract";
    readonly licenseNotice: string;
    readonly editableLayerCount: number;
    readonly fallbackLayerCount: number;
  };
  readonly slides: readonly {
    readonly slideNumber: number;
    readonly canvas: { readonly width: number; readonly height: number };
    readonly layers: readonly FigmaPackageLayer[];
  }[];
};

export function buildFigmaPackage(input: {
  readonly projectId: string;
  readonly design: DesignSystem;
  readonly layers: readonly EditableLayerModel[];
  readonly exportedAt: number;
  readonly reusesReferenceImporter: boolean;
}): FigmaPackage {
  const slides = input.layers.map((model) => ({
    slideNumber: model.slideNumber,
    canvas: { width: input.design.canvas.w, height: input.design.canvas.h },
    layers: model.layers.map((layer) => toFigmaLayer(layer, input.design.colors.secondary)),
  }));
  const counts = slides
    .flatMap((slide) => slide.layers)
    .reduce(
      (summary, layer) => ({
        editable: summary.editable + (layer.editable ? 1 : 0),
        fallback: summary.fallback + (layer.editable ? 0 : 1),
      }),
      { editable: 0, fallback: 0 },
    );
  return {
    manifest: {
      format: "deckforge_figma_package",
      projectId: input.projectId,
      exportedAt: input.exportedAt,
      ownership: "deckforge_local_contract",
      licenseNotice: input.reusesReferenceImporter
        ? "PNG2SVG figma-import.json structure is reused as a reference only; ownership remains local to DeckForge."
        : "Package uses the DeckForge local Figma contract without external runtime dependency.",
      editableLayerCount: counts.editable,
      fallbackLayerCount: counts.fallback,
    },
    slides,
  };
}

export function parseFigmaPackage(pkg: FigmaPackage): {
  readonly editableLayerIds: readonly string[];
  readonly fallbacks: readonly { readonly layerId: string; readonly reason: string }[];
} {
  const editableLayerIds: string[] = [];
  const fallbacks: { layerId: string; reason: string }[] = [];
  for (const slide of pkg.slides) {
    for (const layer of slide.layers) {
      if (layer.kind === "fallback") fallbacks.push({ layerId: layer.id, reason: layer.reason });
      else editableLayerIds.push(layer.id);
    }
  }
  return { editableLayerIds, fallbacks };
}

function toFigmaLayer(
  layer: EditableLayerModel["layers"][number],
  defaultFill: string,
): FigmaPackageLayer {
  switch (layer.type) {
    case "text":
      return {
        id: layer.id,
        kind: "text",
        editable: true,
        text: layer.text ?? "",
        bounds: layer.bounds,
      };
    case "shape":
      return {
        id: layer.id,
        kind: "shape",
        editable: true,
        fill: defaultFill,
        bounds: layer.bounds,
      };
    case "chart":
      return {
        id: layer.id,
        kind: "fallback",
        editable: false,
        reason: "chart layers require image fallback in Figma package",
        bounds: layer.bounds,
      };
    case "image":
      return {
        id: layer.id,
        kind: "fallback",
        editable: false,
        reason: "image layers are preserved as bitmap fallback",
        bounds: layer.bounds,
      };
    default:
      return assertNever(layer.type);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected figma layer type: ${String(value)}`);
}
