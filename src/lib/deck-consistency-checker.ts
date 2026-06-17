import type { DesignSystem, LayoutPrototype } from "./deck-types";
import type {
  DeckConsistencyIssue,
  DeckConsistencyIssueCode,
  DeckConsistencyReport,
  DeckRegenerationCandidate,
} from "./deck-consistency-types";

export type {
  DeckConsistencyIssue,
  DeckConsistencyIssueCode,
  DeckConsistencyReport,
  DeckRegenerationCandidate,
} from "./deck-consistency-types";

export type CheckDeckConsistencyInput = {
  readonly design: DesignSystem;
  readonly layout: LayoutPrototype;
  readonly targetMaxDriftSlides?: number;
};

type LayoutSlide = LayoutPrototype["slides"][number];
type LayoutLayer = LayoutSlide["domLayers"][number];

const TEXT_MIN_HEIGHT = new Map<string, number>([
  ["title", 64],
  ["body", 56],
  ["subtitle", 48],
  ["caption", 24],
  ["source", 24],
  ["metric", 48],
  ["table", 56],
]);

const DECORATIVE_ROLES = new Set(["decoration", "decorative", "ornament", "sparkle"]);

export function checkDeckConsistency(input: CheckDeckConsistencyInput): DeckConsistencyReport {
  const issues = input.layout.slides.flatMap((slide) => evaluateSlide(slide, input.design));
  const regenerationCandidates = createRegenerationCandidates(input.layout.slides, issues);
  const targetMaxDriftSlides = input.targetMaxDriftSlides ?? 2;
  const targetPassed = regenerationCandidates.length <= targetMaxDriftSlides;
  return {
    status: issues.length === 0 && targetPassed ? "passed" : "failed",
    summary: {
      slideCount: input.layout.slides.length,
      driftSlideCount: regenerationCandidates.length,
      violationRate: ratio(regenerationCandidates.length, input.layout.slides.length),
      targetMaxDriftSlides,
      targetPassed,
    },
    issues,
    regenerationCandidates,
  };
}

function evaluateSlide(slide: LayoutSlide, design: DesignSystem): readonly DeckConsistencyIssue[] {
  return [
    ...paletteIssues(slide, design),
    ...titlePositionIssues(slide, design),
    ...safeMarginIssues(slide, design),
    ...textSizeIssues(slide),
    ...chartStyleIssues(slide),
    ...decorativeIssues(slide),
  ];
}

function paletteIssues(slide: LayoutSlide, design: DesignSystem): readonly DeckConsistencyIssue[] {
  const allowedTokens = new Set(Object.keys(design.colors).map((key) => `color.${key}`));
  const invalidToken = colorTokens(slide.html).find((token) => !allowedTokens.has(token));
  if (!invalidToken) return [];
  return [
    issue(
      "palette-token-drift",
      slide.number,
      `Slide uses unapproved palette token ${invalidToken}.`,
    ),
  ];
}

function titlePositionIssues(
  slide: LayoutSlide,
  design: DesignSystem,
): readonly DeckConsistencyIssue[] {
  const title = slide.domLayers.find((layer) => layer.role === "title");
  if (!title) return [issue("title-position-drift", slide.number, "Slide has no title layer.")];
  const expected = design.canvas.safeMargin;
  if (
    title.bounds.x < expected.x ||
    title.bounds.y < expected.y ||
    title.bounds.y > expected.y + 80
  ) {
    return [
      issue(
        "title-position-drift",
        slide.number,
        "Title is outside the approved title origin.",
        title,
      ),
    ];
  }
  return [];
}

function safeMarginIssues(
  slide: LayoutSlide,
  design: DesignSystem,
): readonly DeckConsistencyIssue[] {
  const layer = slide.domLayers.find((candidate) => breachesSafeMargin(candidate, design));
  if (!layer) return [];
  return [
    issue("safe-margin-breach", slide.number, "Layer breaches the approved safe margin.", layer),
  ];
}

function textSizeIssues(slide: LayoutSlide): readonly DeckConsistencyIssue[] {
  const layer = slide.domLayers.find((candidate) => {
    const minHeight = TEXT_MIN_HEIGHT.get(candidate.role);
    return minHeight !== undefined && candidate.bounds.h < minHeight;
  });
  if (!layer) return [];
  return [
    issue("text-size-drift", slide.number, "Text layer bounds are below role minimum.", layer),
  ];
}

function chartStyleIssues(slide: LayoutSlide): readonly DeckConsistencyIssue[] {
  const layer = slide.domLayers.find(
    (candidate) => candidate.role === "chart" && candidate.datasetIds.length === 0,
  );
  if (!layer) return [];
  return [
    issue(
      "chart-style-drift",
      slide.number,
      "Chart placeholder is missing dataset lineage.",
      layer,
    ),
  ];
}

function decorativeIssues(slide: LayoutSlide): readonly DeckConsistencyIssue[] {
  const layer = slide.domLayers.find((candidate) => DECORATIVE_ROLES.has(candidate.role));
  if (!layer) return [];
  return [
    issue("decorative-drift", slide.number, "Decorative layer violates design rules.", layer),
  ];
}

function createRegenerationCandidates(
  slides: readonly LayoutSlide[],
  issues: readonly DeckConsistencyIssue[],
): readonly DeckRegenerationCandidate[] {
  return slides.flatMap((slide) => {
    const slideIssueCodes = [
      ...new Set(
        issues
          .filter((issueItem) => issueItem.slideNumber === slide.number)
          .map((item) => item.code),
      ),
    ];
    if (slideIssueCodes.length === 0) return [];
    return [
      {
        slideNumber: slide.number,
        issueCodes: slideIssueCodes,
        reason: `Slide ${slide.number} has ${slideIssueCodes.join(", ")}.`,
      },
    ];
  });
}

function colorTokens(html: string): readonly string[] {
  const tokens: string[] = [];
  for (const match of html.matchAll(/data-color-token="([^"]+)"/g)) {
    const token = match[1];
    if (token) tokens.push(token);
  }
  return tokens;
}

function breachesSafeMargin(layer: LayoutLayer, design: DesignSystem): boolean {
  const margin = design.canvas.safeMargin;
  const canvas = design.canvas;
  if (layer.bounds.x < margin.x || layer.bounds.y < margin.y) return true;
  if (canvas.w - (layer.bounds.x + layer.bounds.w) < margin.x) return true;
  return canvas.h - (layer.bounds.y + layer.bounds.h) < margin.y;
}

function issue(
  code: DeckConsistencyIssueCode,
  slideNumber: number,
  message: string,
  layer?: LayoutLayer,
): DeckConsistencyIssue {
  return {
    code,
    slideNumber,
    ...(layer === undefined ? {} : { layerId: layer.id }),
    message,
  };
}

function ratio(count: number, total: number): number {
  return total <= 0 ? 0 : Number((count / total).toFixed(3));
}
