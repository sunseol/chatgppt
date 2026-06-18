import type { EditableLayerModel } from "./deck-types";
import type { PptxFallbackReason } from "./pptx-project-export";

export type PptxQualityOutcome = "high" | "medium" | "low";

export type PptxQualityWarning =
  | "fallback_layers_present"
  | "locked_layers_present"
  | "no_editable_layers"
  | "unsupported_dynamic_layers";

export type ProjectExportPptxQuality = {
  readonly totalLayerCount: number;
  readonly editableLayerCount: number;
  readonly fallbackCount: number;
  readonly score: number;
  readonly outcome: PptxQualityOutcome;
  readonly warnings: readonly PptxQualityWarning[];
};

type PptxFallbackLike = {
  readonly reason: PptxFallbackReason;
};

export function assessPptxExportQuality(input: {
  readonly layers: readonly EditableLayerModel[];
  readonly fallbacks: readonly PptxFallbackLike[];
}): ProjectExportPptxQuality {
  const totalLayerCount = input.layers.reduce((sum, model) => sum + model.layers.length, 0);
  const fallbackCount = input.fallbacks.length;
  const editableLayerCount = Math.max(totalLayerCount - fallbackCount, 0);
  const score =
    totalLayerCount === 0 ? 0 : Math.round((editableLayerCount / totalLayerCount) * 100);
  const warnings = qualityWarnings({
    editableLayerCount,
    fallbacks: input.fallbacks,
  });

  return {
    totalLayerCount,
    editableLayerCount,
    fallbackCount,
    score,
    outcome: qualityOutcome(score, warnings),
    warnings,
  };
}

function qualityWarnings(input: {
  readonly editableLayerCount: number;
  readonly fallbacks: readonly PptxFallbackLike[];
}): readonly PptxQualityWarning[] {
  return [
    input.editableLayerCount === 0 ? "no_editable_layers" : undefined,
    input.fallbacks.length > 0 ? "fallback_layers_present" : undefined,
    input.fallbacks.some((fallback) => fallback.reason === "locked_layer")
      ? "locked_layers_present"
      : undefined,
    input.fallbacks.some(
      (fallback) =>
        fallback.reason === "unsupported_chart_layer" ||
        fallback.reason === "unsupported_image_layer",
    )
      ? "unsupported_dynamic_layers"
      : undefined,
  ].filter((warning): warning is PptxQualityWarning => warning !== undefined);
}

function qualityOutcome(
  score: number,
  warnings: readonly PptxQualityWarning[],
): PptxQualityOutcome {
  if (score >= 90 && warnings.length === 0) return "high";
  if (score >= 65) return "medium";
  return "low";
}
