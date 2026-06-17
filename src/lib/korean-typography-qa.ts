import type { ReconstructedTextLayer } from "./text-layer-reconstruction";

export type KoreanTypographyRole = "title" | "body" | "caption" | "source" | "number";

export type KoreanTypographyIssueCode =
  | "corrupted-text"
  | "font-size-too-small"
  | "line-height-too-tight"
  | "letter-spacing-not-zero"
  | "line-wrap-risk"
  | "mixed-text-missing"
  | "source-caption-missing"
  | "source-caption-unreadable";

export type KoreanTypographyIssue = {
  readonly code: KoreanTypographyIssueCode;
  readonly layerId?: string;
  readonly role?: KoreanTypographyRole;
  readonly message: string;
};

export type KoreanTypographyBenchmarkReport = {
  readonly passed: boolean;
  readonly summary: {
    readonly layerCount: number;
    readonly corruptedLayerCount: number;
    readonly mixedTextLayerCount: number;
    readonly sourceCaptionCount: number;
    readonly minimumSizeViolationCount: number;
    readonly lineHeightViolationCount: number;
    readonly lineWrapRiskCount: number;
  };
  readonly issues: readonly KoreanTypographyIssue[];
};

type TypographyThreshold = { readonly minSizePx: number; readonly minLineHeight: number };

const THRESHOLDS = {
  title: { minSizePx: 44, minLineHeight: 1.12 },
  body: { minSizePx: 24, minLineHeight: 1.35 },
  caption: { minSizePx: 18, minLineHeight: 1.25 },
  source: { minSizePx: 18, minLineHeight: 1.25 },
  number: { minSizePx: 28, minLineHeight: 1.3 },
} as const satisfies Record<KoreanTypographyRole, TypographyThreshold>;

const MAX_KOREAN_LINES = {
  title: 2,
  body: 4,
  caption: 2,
  source: 2,
  number: 1,
} as const satisfies Record<KoreanTypographyRole, number>;

export function runKoreanTypographyBenchmark(input: {
  readonly layers: readonly ReconstructedTextLayer[];
}): KoreanTypographyBenchmarkReport {
  const layerIssues = input.layers.flatMap(evaluateLayer);
  const mixedTextLayerCount = input.layers.filter(hasReadableMixedText).length;
  const sourceCaptionCount = input.layers.filter(isSourceCaption).length;
  const issues = [
    ...layerIssues,
    ...missingCoverageIssues(mixedTextLayerCount, sourceCaptionCount),
  ];
  const summary = {
    layerCount: input.layers.length,
    corruptedLayerCount: layerIssues.filter((issue) => issue.code === "corrupted-text").length,
    mixedTextLayerCount,
    sourceCaptionCount,
    minimumSizeViolationCount: layerIssues.filter((issue) => issue.code === "font-size-too-small")
      .length,
    lineHeightViolationCount: layerIssues.filter((issue) => issue.code === "line-height-too-tight")
      .length,
    lineWrapRiskCount: layerIssues.filter((issue) => issue.code === "line-wrap-risk").length,
  };

  return {
    passed: issues.length === 0,
    summary,
    issues,
  };
}

function evaluateLayer(layer: ReconstructedTextLayer): readonly KoreanTypographyIssue[] {
  const role = roleForLayer(layer);
  const threshold = THRESHOLDS[role];
  const issues: KoreanTypographyIssue[] = [];
  if (layer.text.includes("\uFFFD")) {
    issues.push(
      layerIssue("corrupted-text", layer, role, "Korean text contains a replacement character."),
    );
  }
  if (layer.font.sizePx < threshold.minSizePx) {
    issues.push(
      layerIssue(
        "font-size-too-small",
        layer,
        role,
        `${role} font size ${layer.font.sizePx}px is below ${threshold.minSizePx}px.`,
      ),
    );
  }
  if (layer.font.lineHeight < threshold.minLineHeight) {
    issues.push(
      layerIssue(
        "line-height-too-tight",
        layer,
        role,
        `${role} line-height ${layer.font.lineHeight} is below ${threshold.minLineHeight}.`,
      ),
    );
  }
  if (layer.font.letterSpacing !== "0em") {
    issues.push(
      layerIssue(
        "letter-spacing-not-zero",
        layer,
        role,
        "Korean typography requires zero letter spacing.",
      ),
    );
  }
  if (hasLineWrapRisk(layer, role)) {
    issues.push(
      layerIssue(
        "line-wrap-risk",
        layer,
        role,
        "Korean text is too long for the available text bounds.",
      ),
    );
  }
  if (role === "source" && !readableLayer(layer, threshold)) {
    issues.push(
      layerIssue(
        "source-caption-unreadable",
        layer,
        role,
        "Source caption is present but below readability thresholds.",
      ),
    );
  }
  return issues;
}

function roleForLayer(layer: ReconstructedTextLayer): KoreanTypographyRole {
  if (layer.role === "title" || layer.role === "sectionMarker") return "title";
  if (layer.role === "source") return "source";
  if (layer.role === "caption") return "caption";
  if (layer.role === "metric" || layer.role === "number") return "number";
  return "body";
}

function layerIssue(
  code: KoreanTypographyIssueCode,
  layer: ReconstructedTextLayer,
  role: KoreanTypographyRole,
  message: string,
): KoreanTypographyIssue {
  return {
    code,
    layerId: layer.id,
    role,
    message,
  };
}

function missingCoverageIssues(
  mixedTextLayerCount: number,
  sourceCaptionCount: number,
): readonly KoreanTypographyIssue[] {
  const issues: KoreanTypographyIssue[] = [];
  if (mixedTextLayerCount === 0) {
    issues.push({
      code: "mixed-text-missing",
      message: "Benchmark must include readable Korean/English/number mixed text.",
    });
  }
  if (sourceCaptionCount === 0) {
    issues.push({
      code: "source-caption-missing",
      message: "Benchmark must include at least one source caption layer.",
    });
  }
  return issues;
}

function hasReadableMixedText(layer: ReconstructedTextLayer): boolean {
  const text = layer.text.trim();
  return (
    text.length > 0 &&
    hasKorean(text) &&
    hasLatin(text) &&
    hasDigit(text) &&
    readableLayer(layer, THRESHOLDS[roleForLayer(layer)])
  );
}

function isSourceCaption(layer: ReconstructedTextLayer): boolean {
  return roleForLayer(layer) === "source" && layer.text.trim().length > 0;
}

function readableLayer(layer: ReconstructedTextLayer, threshold: TypographyThreshold): boolean {
  if (layer.text.includes("\uFFFD")) return false;
  if (layer.font.sizePx < threshold.minSizePx) return false;
  if (layer.font.lineHeight < threshold.minLineHeight) return false;
  return layer.font.letterSpacing === "0em";
}

function hasLineWrapRisk(layer: ReconstructedTextLayer, role: KoreanTypographyRole): boolean {
  if (!hasKorean(layer.text)) return false;
  const estimatedCharsPerLine = Math.max(1, Math.floor(layer.bounds.w / (layer.font.sizePx * 0.8)));
  const maxCharacters = estimatedCharsPerLine * MAX_KOREAN_LINES[role];
  return layer.text.split(/\r?\n/).some((line) => line.length > maxCharacters);
}

const hasKorean = (text: string): boolean => /[가-힣]/.test(text);
const hasLatin = (text: string): boolean => /[A-Za-z]/.test(text);
const hasDigit = (text: string): boolean => /\d/.test(text);
