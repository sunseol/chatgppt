import type { LiveBackgroundBatchIssue } from "./live-background-batch";
import type { SlidePromptPackage } from "./slide-prompt-package";

const EXACT_TEXT_OVERLAY_RULE = "Do not render exact title, body, metric, chart, or source text.";
const EXACT_NO_INVENT_RULE = "Do not invent numbers, logos, citations, charts, or source captions.";

export function textOverlayIssues(pkg: SlidePromptPackage): readonly LiveBackgroundBatchIssue[] {
  return textOverlayStrategyMatchesPackage(pkg) &&
    hasPromptTextOverlayRule(pkg) &&
    hasStructuredOverlayRules(pkg) &&
    pkg.textOverlayStrategy.reservedOverlayLayerIds.length > 0 &&
    pkg.textOverlayStrategy.generatedBackgroundLayerIds.length > 0
    ? []
    : [
        {
          code: "missing_text_overlay_rule",
          slideNumber: pkg.slideNumber,
          message: "Prompt package must include matching structured text overlay exclusion rules.",
        },
      ];
}

function textOverlayStrategyMatchesPackage(pkg: SlidePromptPackage): boolean {
  const strategy = pkg.textOverlayStrategy;
  return (
    strategy.bundleId === pkg.bundleId &&
    strategy.deckContextId === pkg.deckContextId &&
    strategy.deckContextHash === pkg.deckContextHash &&
    strategy.slideNumber === pkg.slideNumber &&
    strategy.layoutScreenshot === pkg.layoutScreenshot
  );
}

function hasPromptTextOverlayRule(pkg: SlidePromptPackage): boolean {
  return pkg.prompt.includes("Do not render exact title, body, metric, chart, or source text");
}

function hasStructuredOverlayRules(pkg: SlidePromptPackage): boolean {
  return (
    pkg.textOverlayStrategy.negativePromptRules.includes(EXACT_TEXT_OVERLAY_RULE) &&
    pkg.textOverlayStrategy.negativePromptRules.includes(EXACT_NO_INVENT_RULE)
  );
}
