import type { DesignSystem, LayoutPrototype } from "./deck-types";

export type DeckStyleSample = {
  readonly deckId: string;
  readonly source: "local_upload" | "workspace_snapshot" | "remote_import";
  readonly design: DesignSystem;
  readonly layout: LayoutPrototype;
};

export type DeckStyleProfile = {
  readonly sampleCount: number;
  readonly primaryColor: string;
  readonly visualLanguage: string;
  readonly titleStyle: string;
  readonly bodyStyle: string;
  readonly topComponents: readonly string[];
};

export type DeckStyleRecommendation = {
  readonly status: "pending_approval" | "approved";
  readonly designPatch: {
    readonly primaryColor: string;
    readonly visualLanguage: string;
    readonly titleStyle: string;
    readonly bodyStyle: string;
  };
  readonly layoutHints: {
    readonly topComponents: readonly string[];
  };
  readonly approval?: {
    readonly approvedAt: number;
    readonly approvedBy: string;
  };
};

export class DeckStyleLearningError extends Error {
  readonly name = "DeckStyleLearningError";
}

export function extractDeckStyleProfile(samples: readonly DeckStyleSample[]): DeckStyleProfile {
  if (samples.length === 0)
    throw new DeckStyleLearningError("At least one local deck sample is required.");
  if (samples.some((sample) => sample.source === "remote_import")) {
    throw new DeckStyleLearningError("Past deck style learning must remain local-first.");
  }
  return {
    sampleCount: samples.length,
    primaryColor: mostCommon(samples.map((sample) => sample.design.colors.primary)),
    visualLanguage: mostCommon(samples.map((sample) => sample.design.visualLanguage)),
    titleStyle: mostCommon(samples.map((sample) => sample.design.typography.title.style)),
    bodyStyle: mostCommon(samples.map((sample) => sample.design.typography.body.style)),
    topComponents: rankedComponents(samples),
  };
}

export function recommendDeckStyleApplication(
  _baseDesign: DesignSystem,
  profile: DeckStyleProfile,
): DeckStyleRecommendation {
  return {
    status: "pending_approval",
    designPatch: {
      primaryColor: profile.primaryColor,
      visualLanguage: profile.visualLanguage,
      titleStyle: profile.titleStyle,
      bodyStyle: profile.bodyStyle,
    },
    layoutHints: { topComponents: profile.topComponents },
  };
}

export function approveDeckStyleRecommendation(
  recommendation: DeckStyleRecommendation,
  input: { readonly approvedAt: number; readonly approvedBy: string },
): DeckStyleRecommendation {
  return { ...recommendation, status: "approved", approval: input };
}

export function applyApprovedDeckStyleRecommendation(
  design: DesignSystem,
  recommendation: DeckStyleRecommendation,
): { readonly design: DesignSystem; readonly layoutHints: DeckStyleRecommendation["layoutHints"] } {
  if (recommendation.status !== "approved") {
    throw new DeckStyleLearningError(
      "Style recommendation requires user approval before application.",
    );
  }
  return {
    design: {
      ...design,
      colors: { ...design.colors, primary: recommendation.designPatch.primaryColor },
      visualLanguage: recommendation.designPatch.visualLanguage,
      typography: {
        ...design.typography,
        titleStyle: recommendation.designPatch.titleStyle,
        bodyStyle: recommendation.designPatch.bodyStyle,
        title: { ...design.typography.title, style: recommendation.designPatch.titleStyle },
        body: { ...design.typography.body, style: recommendation.designPatch.bodyStyle },
      },
    },
    layoutHints: recommendation.layoutHints,
  };
}

function rankedComponents(samples: readonly DeckStyleSample[]): readonly string[] {
  const stats = new Map<string, { count: number; firstSeen: number }>();
  let order = 0;
  for (const sample of samples) {
    for (const slide of sample.layout.slides) {
      const existing = stats.get(slide.componentType);
      if (existing === undefined) stats.set(slide.componentType, { count: 1, firstSeen: order++ });
      else stats.set(slide.componentType, { ...existing, count: existing.count + 1 });
    }
  }
  return [...stats.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[1].firstSeen - right[1].firstSeen)
    .map(([componentType]) => componentType)
    .slice(0, 2);
}

function mostCommon(values: readonly string[]): string {
  const counts = new Map<string, { count: number; firstSeen: number }>();
  for (const [index, value] of values.entries()) {
    const existing = counts.get(value);
    counts.set(
      value,
      existing === undefined
        ? { count: 1, firstSeen: index }
        : { ...existing, count: existing.count + 1 },
    );
  }
  return (
    [...counts.entries()].sort(
      (left, right) => right[1].count - left[1].count || left[1].firstSeen - right[1].firstSeen,
    )[0]?.[0] ?? ""
  );
}
