import type { DesignSystem, StepKey } from "./deck-types";
import { invalidatedAfter } from "./workflow-engine";

export const DESIGN_COLOR_KEYS = [
  "background",
  "textPrimary",
  "textSecondary",
  "primary",
  "secondary",
  "accent",
] as const;

export const DESIGN_TYPOGRAPHY_KEYS = ["title", "body", "caption", "number"] as const;
export const TYPOGRAPHY_BOUND_FIELDS = ["minPx", "maxPx"] as const;

export type DesignColorKey = (typeof DESIGN_COLOR_KEYS)[number];
export type DesignTypographyKey = (typeof DESIGN_TYPOGRAPHY_KEYS)[number];
export type TypographyBoundField = (typeof TYPOGRAPHY_BOUND_FIELDS)[number];

export interface DesignDraftUpdate {
  readonly design: DesignSystem;
  readonly invalidated: Partial<Record<StepKey, true>>;
}

export function updateDesignColor(
  design: DesignSystem,
  key: DesignColorKey,
  value: string,
): DesignSystem {
  return {
    ...design,
    colors: { ...design.colors, [key]: value },
  };
}

export function updateDesignTypographyRule(
  design: DesignSystem,
  key: DesignTypographyKey,
  field: TypographyBoundField,
  value: number,
): DesignSystem {
  return {
    ...design,
    typography: {
      ...design.typography,
      [key]: { ...design.typography[key], [field]: value },
    },
  };
}

export function updateDesignNegativeRules(
  design: DesignSystem,
  negativeRules: readonly string[],
): DesignSystem {
  return {
    ...design,
    negativeRules: [...negativeRules],
  };
}

export function parseNegativeRuleText(text: string): readonly string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function createDesignDraftUpdate(design: DesignSystem): DesignDraftUpdate {
  return {
    design,
    invalidated: invalidatedAfter("design"),
  };
}
