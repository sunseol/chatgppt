import { describe, expect, test } from "bun:test";
import {
  buildFullSlideDesignConsistencyContract,
  validateFullSlideDesignConsistency,
} from "./full-slide-design-consistency";
import type { SlideContextBundle } from "./slide-context-bundle";
import type { SlidePromptPackage } from "./slide-prompt-package";

describe("full-slide design consistency contract", () => {
  test("builds a slide image control contract with canvas, component grammar, allowed variation, and forbidden failures", () => {
    const contract = buildFullSlideDesignConsistencyContract(controlBundle());

    expect(contract.outputKind).toBe("full_presentation_slide");
    expect(contract.designSystemId).toBe("design_control_v1");
    expect(contract.canvas).toEqual({
      aspectRatio: "16:9",
      width: 1600,
      height: 900,
      safeAreaPx: { top: 72, right: 96, bottom: 72, left: 96 },
    });
    expect(contract.componentGrammar.cards.includes("same radius")).toBe(true);
    expect(contract.componentGrammar.nodesLines.includes("line must pass through exact node centers")).toBe(true);
    expect(contract.componentGrammar.icons.includes("same stroke")).toBe(true);
    expect(contract.allowedVariation.includes("layout_archetype")).toBe(true);
    expect(contract.allowedVariation.includes("hero_motif_position")).toBe(true);
    expect(contract.allowedVariation.includes("accent_emphasis")).toBe(true);
    expect(contract.forbiddenFailures.includes("cropped_text")).toBe(true);
    expect(contract.forbiddenFailures.includes("fake_microcopy")).toBe(true);
    expect(contract.forbiddenFailures.includes("mask_leakage")).toBe(true);
    expect(contract.forbiddenFailures.includes("region_intrusion")).toBe(true);
    expect(contract.forbiddenFailures.includes("node_line_misalignment")).toBe(true);
    expect(contract.forbiddenFailures.includes("poster_only_composition")).toBe(true);
    expect(contract.promptBlock.includes("Canvas: 16:9 1600x900")).toBe(true);
    expect(contract.promptBlock.includes("Safe area: top 72px, right 96px, bottom 72px, left 96px")).toBe(true);
    expect(contract.promptBlock.includes("line must pass through exact node centers")).toBe(true);
    expect(contract.promptBlock.includes("Forbidden failures: cropped_text, fake_microcopy, mask_leakage, region_intrusion, node_line_misalignment, poster_only_composition")).toBe(true);
  });

  test("keeps contract id stable for equivalent input and changes it when control-critical rules change", () => {
    const first = buildFullSlideDesignConsistencyContract(controlBundle());
    const equivalent = buildFullSlideDesignConsistencyContract(controlBundle());
    const changed = buildFullSlideDesignConsistencyContract({
      ...controlBundle(),
      designTokens: {
        ...controlBundle().designTokens,
        componentRules: [...controlBundle().designTokens.componentRules, "route nodes must be larger"],
      },
    });

    expect(first.contractId).toBe(equivalent.contractId);
    expect(changed.contractId === first.contractId).toBe(false);
  });

  test("blocks prompt packages that omit control contract prompt rules", () => {
    const pkg = promptPackageWithoutControlRules();

    const validation = validateFullSlideDesignConsistency([pkg]);

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code).includes("missing_contract_rule")).toBe(true);
    expect(validation.issues.map((issue) => issue.message).join("\n").includes("Canvas: 16:9")).toBe(true);
    expect(validation.issues.map((issue) => issue.message).join("\n").includes("Forbidden failures")).toBe(true);
  });
});

function promptPackageWithoutControlRules(): SlidePromptPackage {
  const designConsistency = buildFullSlideDesignConsistencyContract(controlBundle());
  return {
    promptId: "slide_generation",
    promptVersion: "v1",
    promptHash: "sha256:prompt",
    outputKind: "full_presentation_slide",
    bundleId: "bundle_001",
    deckContextId: "deck_context_001",
    deckContextHash: "sha256:deck_context",
    designSystemId: "design_control_v1",
    designConsistency,
    slideControlSpec: {
      outputKind: "full_presentation_slide",
      designConsistencyContractId: designConsistency.contractId,
      layoutArchetype: "cover_hero",
      slideRole: "cover",
      visualHierarchy: {
        title: "서울시 마라톤",
        keyMessage: "도심 러닝 경험을 시민 캠페인으로 확장",
        visualType: "hero_anchor",
      },
      mustPreserve: [
        "header/footer locked positions",
        "card radius/stroke/shadow family",
        "safe area top 72px right 96px bottom 72px left 96px",
        "same palette and typography fingerprints",
      ],
      mustAvoid: [...designConsistency.forbiddenFailures],
    },
    slideNumber: 1,
    layoutScreenshot: "slide_01_layout.png",
    sourceMapIds: [],
    textOverlayStrategy: {
      bundleId: "bundle_001",
      deckContextId: "deck_context_001",
      deckContextHash: "sha256:deck_context",
      slideNumber: 1,
      layoutScreenshot: "slide_01_layout.png",
      reservedOverlayLayerIds: [],
      generatedBackgroundLayerIds: [],
      layers: [],
      negativePromptRules: [],
    },
    prompt: [
      "[DESIGN CONSISTENCY CONTRACT]",
      `Contract ID: ${designConsistency.contractId}`,
      "Output kind: full_presentation_slide",
      "Header/footer template is locked across all slides",
      "Card component rules are locked across all slides",
      "Icon family and stroke weight are locked across all slides",
      "Repeating motif is locked across all slides",
      "Maximum text density is locked across all slides",
    ].join("\n"),
  };
}

function controlBundle(): SlideContextBundle {
  return {
    bundleId: "bundle_deck_context_001_slide_01",
    deckContextId: "deck_context_001",
    deckContextHash: "sha256:deck_context",
    designSystemId: "design_control_v1",
    globalSummary: {
      goal: "서울시 마라톤 샘플 덱",
      audience: "행사 운영 의사결정자",
      tone: ["confident", "urban", "precise"],
      slideCount: 6,
      language: "ko",
    },
    designTokens: {
      colors: {
        background: "#08111F",
        textPrimary: "#F8FAFC",
        textSecondary: "#CBD5E1",
        primary: "#23D3EE",
        secondary: "#FF4FA3",
        accent: "#FACC15",
      },
      typography: {
        titleStyle: "bold geometric Korean sans",
        bodyStyle: "clean Korean sans",
        title: { style: "bold geometric Korean sans", minPx: 44, maxPx: 72 },
        body: { style: "clean Korean sans", minPx: 22, maxPx: 34 },
        caption: { style: "clean Korean sans", minPx: 14, maxPx: 18 },
        number: { style: "condensed numeric", minPx: 28, maxPx: 56 },
      },
      layoutRules: ["16:9 canvas", "96px horizontal safe margins", "72px vertical safe margins"],
      componentRules: ["glass cards use same radius and stroke", "route line nodes align to exact centers"],
      visualLanguage: "dark neon Seoul running-lane motif",
      negativeRules: ["no cropped text", "no fake UI labels", "no region intrusion"],
    },
    layoutPrototype: {
      layoutPrototypeId: "layout_001",
      layoutScreenshot: "slide_01_layout.png",
      domLayers: [],
    },
    slideSpec: {
      slideNumber: 1,
      title: "서울시 마라톤",
      role: "cover",
      message: "도심 러닝 경험을 시민 캠페인으로 확장",
      visualType: "hero_anchor",
    },
    sourceMap: {
      slideId: "slide_01",
      sourceMapIds: [],
      claimIds: [],
      sourceIds: [],
      datasetIds: [],
    },
    facts: [],
  };
}
