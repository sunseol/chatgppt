import type { EditableLayerModel } from "./deck-types";

type CanvaLayer =
  | { readonly id: string; readonly kind: "text" | "shape" | "image"; readonly editable: true }
  | {
      readonly id: string;
      readonly kind: "fallback";
      readonly editable: false;
      readonly reason: string;
    };

export function buildCanvaCompatibilityPackage(input: {
  readonly projectId: string;
  readonly layers: readonly EditableLayerModel[];
  readonly exportedAt: number;
}): {
  readonly manifest: {
    readonly format: "deckforge_canva_import_package";
    readonly projectId: string;
    readonly exportedAt: number;
    readonly limitations: readonly string[];
  };
  readonly slides: readonly {
    readonly slideNumber: number;
    readonly layers: readonly CanvaLayer[];
  }[];
} {
  return {
    manifest: {
      format: "deckforge_canva_import_package",
      projectId: input.projectId,
      exportedAt: input.exportedAt,
      limitations: [
        "charts are flattened because Canva import does not preserve chart semantics",
        "group nesting may be simplified during Canva import",
        "custom fonts still require availability in the destination Canva workspace",
      ],
    },
    slides: input.layers.map((model) => ({
      slideNumber: model.slideNumber,
      layers: model.layers.map((layer) => {
        switch (layer.type) {
          case "text":
            return { id: layer.id, kind: "text", editable: true };
          case "shape":
            return { id: layer.id, kind: "shape", editable: true };
          case "image":
            return { id: layer.id, kind: "image", editable: true };
          case "chart":
            return {
              id: layer.id,
              kind: "fallback",
              editable: false,
              reason: "chart flattened for Canva compatibility",
            };
          default:
            return assertNever(layer.type);
        }
      }),
    })),
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected canva layer type: ${String(value)}`);
}
