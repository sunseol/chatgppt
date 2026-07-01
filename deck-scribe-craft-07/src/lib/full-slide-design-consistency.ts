import { hashContent } from "./artifacts";
import type { SlideContextBundle } from "./slide-context-bundle";
import type { SlidePromptPackage } from "./slide-prompt-package";

export type FullSlideOutputKind = "full_presentation_slide";

export type FullSlideControlCanvas = {
  readonly aspectRatio: "16:9";
  readonly width: 1600;
  readonly height: 900;
  readonly safeAreaPx: {
    readonly top: 72;
    readonly right: 96;
    readonly bottom: 72;
    readonly left: 96;
  };
};

export type FullSlideComponentGrammar = {
  readonly cards: string;
  readonly nodesLines: string;
  readonly icons: string;
};

export type FullSlideForbiddenFailure =
  | "cropped_text"
  | "fake_microcopy"
  | "mask_leakage"
  | "region_intrusion"
  | "node_line_misalignment"
  | "poster_only_composition";

export type FullSlideAllowedVariation =
  | "layout_archetype"
  | "hero_motif_position"
  | "accent_emphasis";

export type FullSlideDesignConsistencyContract = {
  readonly contractId: string;
  readonly outputKind: FullSlideOutputKind;
  readonly designSystemId: string;
  readonly canvas: FullSlideControlCanvas;
  readonly paletteFingerprint: string;
  readonly typographyFingerprint: string;
  readonly componentGrammar: FullSlideComponentGrammar;
  readonly allowedVariation: readonly FullSlideAllowedVariation[];
  readonly forbiddenFailures: readonly FullSlideForbiddenFailure[];
  readonly lockedRules: {
    readonly headerFooter: string;
    readonly cards: string;
    readonly icons: string;
    readonly motif: string;
    readonly grid: string;
    readonly textDensity: string;
  };
  readonly promptBlock: string;
};

export type FullSlideDesignConsistencyIssue = {
  readonly code:
    | "missing_prompt_package"
    | "output_kind_mismatch"
    | "contract_id_mismatch"
    | "missing_contract_prompt_block"
    | "missing_contract_rule";
  readonly message: string;
  readonly slideNumber?: number;
};

export type FullSlideDesignConsistencyValidation =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly FullSlideDesignConsistencyIssue[] };

const OUTPUT_KIND: FullSlideOutputKind = "full_presentation_slide";
const CONTROL_CANVAS: FullSlideControlCanvas = {
  aspectRatio: "16:9",
  width: 1600,
  height: 900,
  safeAreaPx: { top: 72, right: 96, bottom: 72, left: 96 },
};
const ALLOWED_VARIATION: readonly FullSlideAllowedVariation[] = [
  "layout_archetype",
  "hero_motif_position",
  "accent_emphasis",
];
const FORBIDDEN_FAILURES: readonly FullSlideForbiddenFailure[] = [
  "cropped_text",
  "fake_microcopy",
  "mask_leakage",
  "region_intrusion",
  "node_line_misalignment",
  "poster_only_composition",
];

const REQUIRED_PROMPT_RULES = [
  "[DESIGN CONSISTENCY CONTRACT]",
  "Output kind: full_presentation_slide",
  "Canvas: 16:9",
  "Safe area: top 72px, right 96px, bottom 72px, left 96px",
  "Header/footer template is locked across all slides",
  "Card component rules are locked across all slides",
  "Icon family and stroke weight are locked across all slides",
  "Repeating motif is locked across all slides",
  "Maximum text density is locked across all slides",
  "line must pass through exact node centers",
  "Forbidden failures:",
] as const;

export function buildFullSlideDesignConsistencyContract(
  bundle: SlideContextBundle,
): FullSlideDesignConsistencyContract {
  const paletteFingerprint = canonicalJson(bundle.designTokens.colors);
  const typographyFingerprint = canonicalJson(bundle.designTokens.typography);
  const componentRules = joinRules(bundle.designTokens.componentRules);
  const layoutRules = joinRules(bundle.designTokens.layoutRules);
  const negativeRules = joinRules(bundle.designTokens.negativeRules);
  const visualLanguage = bundle.designTokens.visualLanguage.trim() || "approved visual language";
  const componentGrammar = {
    cards: `Card grammar: same radius, stroke, shadow, padding, and label placement across the deck. Approved component rules: ${componentRules}`,
    nodesLines:
      "Node/line grammar: line must pass through exact node centers; no line overshoot; labels stay centered under nodes and inside the safe area.",
    icons:
      "Icon grammar: same stroke family, same visual weight, no mixed filled badges/dashboard icons unless explicitly approved.",
  };
  const lockedRules = {
    headerFooter:
      "Header/footer template is locked across all slides: same brand label position, same slide-number position, same footer rule, and cover-only exceptions must be explicit.",
    cards: `Card component rules are locked across all slides: ${componentGrammar.cards}`,
    icons: `Icon family and stroke weight are locked across all slides: ${componentGrammar.icons}`,
    motif: `Repeating motif is locked across all slides: reuse the approved visual language/motif instead of inventing a new visual metaphor. Approved visual language: ${visualLanguage}`,
    grid: `Grid and spacing rhythm are locked across all slides: preserve the approved grid, margins, and title/content baselines. Approved layout rules: ${layoutRules}`,
    textDensity: `Maximum text density is locked across all slides: large sparse title/labels only; no dashboard microtext, tiny footers, fake map labels, or dense body copy. Negative rules: ${negativeRules}`,
  };
  const contractSeed = {
    outputKind: OUTPUT_KIND,
    designSystemId: bundle.designSystemId,
    canvas: CONTROL_CANVAS,
    paletteFingerprint,
    typographyFingerprint,
    componentGrammar,
    allowedVariation: ALLOWED_VARIATION,
    forbiddenFailures: FORBIDDEN_FAILURES,
    lockedRules,
  };
  const contractId = `full_slide_design_contract_${hashContent(canonicalJson(contractSeed)).replace(
    "sha256:",
    "",
  )}`;
  return {
    contractId,
    outputKind: OUTPUT_KIND,
    designSystemId: bundle.designSystemId,
    canvas: CONTROL_CANVAS,
    paletteFingerprint,
    typographyFingerprint,
    componentGrammar,
    allowedVariation: ALLOWED_VARIATION,
    forbiddenFailures: FORBIDDEN_FAILURES,
    lockedRules,
    promptBlock: buildPromptBlock({
      contractId,
      canvas: CONTROL_CANVAS,
      componentGrammar,
      allowedVariation: ALLOWED_VARIATION,
      forbiddenFailures: FORBIDDEN_FAILURES,
      lockedRules,
      paletteFingerprint,
      typographyFingerprint,
    }),
  };
}

export function validateFullSlideDesignConsistency(
  packages: readonly SlidePromptPackage[],
): FullSlideDesignConsistencyValidation {
  if (packages.length === 0) {
    return {
      kind: "blocked",
      issues: [{ code: "missing_prompt_package", message: "At least one prompt package is required." }],
    };
  }

  const issues: FullSlideDesignConsistencyIssue[] = [];
  const firstContractId = packages[0]?.designConsistency.contractId;
  for (const pkg of packages) {
    if (pkg.outputKind !== OUTPUT_KIND) {
      issues.push({
        code: "output_kind_mismatch",
        slideNumber: pkg.slideNumber,
        message: `Slide ${pkg.slideNumber} must request output_kind=${OUTPUT_KIND}.`,
      });
    }
    if (pkg.designConsistency.contractId !== firstContractId) {
      issues.push({
        code: "contract_id_mismatch",
        slideNumber: pkg.slideNumber,
        message: `Slide ${pkg.slideNumber} uses a different design consistency contract.`,
      });
    }
    if (!pkg.prompt.includes(pkg.designConsistency.promptBlock)) {
      issues.push({
        code: "missing_contract_prompt_block",
        slideNumber: pkg.slideNumber,
        message: `Slide ${pkg.slideNumber} prompt must include the exact design consistency contract block.`,
      });
    }
    for (const required of REQUIRED_PROMPT_RULES) {
      if (!pkg.prompt.includes(required)) {
        issues.push({
          code: "missing_contract_rule",
          slideNumber: pkg.slideNumber,
          message: `Slide ${pkg.slideNumber} prompt is missing design consistency rule: ${required}`,
        });
      }
    }
  }

  if (issues.length > 0) return { kind: "blocked", issues };
  return { kind: "ready" };
}

function buildPromptBlock(input: {
  readonly contractId: string;
  readonly canvas: FullSlideControlCanvas;
  readonly componentGrammar: FullSlideComponentGrammar;
  readonly allowedVariation: readonly FullSlideAllowedVariation[];
  readonly forbiddenFailures: readonly FullSlideForbiddenFailure[];
  readonly lockedRules: FullSlideDesignConsistencyContract["lockedRules"];
  readonly paletteFingerprint: string;
  readonly typographyFingerprint: string;
}): string {
  return [
    "[DESIGN CONSISTENCY CONTRACT]",
    `Contract ID: ${input.contractId}`,
    "Output kind: full_presentation_slide",
    `Canvas: ${input.canvas.aspectRatio} ${input.canvas.width}x${input.canvas.height}`,
    `Safe area: top ${input.canvas.safeAreaPx.top}px, right ${input.canvas.safeAreaPx.right}px, bottom ${input.canvas.safeAreaPx.bottom}px, left ${input.canvas.safeAreaPx.left}px`,
    `Palette fingerprint: ${input.paletteFingerprint}`,
    `Typography fingerprint: ${input.typographyFingerprint}`,
    `- ${input.lockedRules.headerFooter}`,
    `- ${input.lockedRules.cards}`,
    `- ${input.componentGrammar.nodesLines}`,
    `- ${input.lockedRules.icons}`,
    `- ${input.lockedRules.motif}`,
    `- ${input.lockedRules.grid}`,
    `- ${input.lockedRules.textDensity}`,
    `Allowed variation: ${input.allowedVariation.join(", ")}`,
    `Forbidden failures: ${input.forbiddenFailures.join(", ")}`,
    "- Treat this contract as a hard constraint. If the slide idea conflicts with it, simplify the slide idea instead of changing the system.",
  ].join("\n");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }
  return value;
}

function joinRules(rules: readonly string[]): string {
  return rules.length === 0 ? "none" : rules.join("; ");
}
