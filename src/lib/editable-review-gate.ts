import type { EditableLayerModel } from "./deck-types";

export type EditableReviewGateStatus = "passed" | "blocked";
export type EditableReviewGateFailureCode =
  | "missing_layers"
  | "empty_slide_layers"
  | "slide_without_editable_layers";

export type EditableReviewGateFailure = {
  readonly code: EditableReviewGateFailureCode;
  readonly severity: "fatal";
  readonly slideNumber?: number;
  readonly message: string;
};

export type EditableReviewGateReport = {
  readonly status: EditableReviewGateStatus;
  readonly canApprove: boolean;
  readonly slideCount: number;
  readonly totalLayers: number;
  readonly editableLayers: number;
  readonly editableRatio: number;
  readonly failures: readonly EditableReviewGateFailure[];
};

export function evaluateEditableReviewGate(
  layers: readonly EditableLayerModel[],
): EditableReviewGateReport {
  const failures = gateFailures(layers);
  const totalLayers = layers.reduce((sum, model) => sum + model.layers.length, 0);
  const editableLayers = layers.reduce(
    (sum, model) => sum + model.layers.filter((layer) => layer.editable).length,
    0,
  );
  const canApprove = failures.length === 0;

  return {
    status: canApprove ? "passed" : "blocked",
    canApprove,
    slideCount: layers.length,
    totalLayers,
    editableLayers,
    editableRatio: totalLayers === 0 ? 0 : Math.round((editableLayers / totalLayers) * 100),
    failures,
  };
}

function gateFailures(layers: readonly EditableLayerModel[]): readonly EditableReviewGateFailure[] {
  if (layers.length === 0) {
    return [
      {
        code: "missing_layers",
        severity: "fatal",
        message: "No SVG/layer conversion output is available for review.",
      },
    ];
  }

  return layers.flatMap((model) => failuresForSlide(model));
}

function failuresForSlide(model: EditableLayerModel): readonly EditableReviewGateFailure[] {
  if (model.layers.length === 0) {
    return [
      {
        code: "empty_slide_layers",
        severity: "fatal",
        slideNumber: model.slideNumber,
        message: `Slide ${model.slideNumber} has no layer output.`,
      },
    ];
  }

  const editableCount = model.layers.filter((layer) => layer.editable).length;
  if (editableCount > 0) return [];

  return [
    {
      code: "slide_without_editable_layers",
      severity: "fatal",
      slideNumber: model.slideNumber,
      message: `Slide ${model.slideNumber} has no editable layers.`,
    },
  ];
}
