import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { createFrozenDeckContext } from "./deck-context";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { getPromptAsset } from "./prompt-assets";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import { buildSlidePromptPackage } from "./slide-prompt-package";

describe("slide prompt package", () => {
  test("builds a versioned package with frozen context and layout lineage", () => {
    const bundle = chartSlideBundle();
    const promptAsset = getPromptAsset("slide_generation");
    const pkg = buildSlidePromptPackage(bundle);

    expect({
      promptId: pkg.promptId,
      promptVersion: pkg.promptVersion,
      promptHash: pkg.promptHash,
      deckContextId: pkg.deckContextId,
      designSystemId: pkg.designSystemId,
      slideNumber: pkg.slideNumber,
      layoutScreenshot: pkg.layoutScreenshot,
      sourceMapCount: pkg.sourceMapIds.length,
    }).toEqual({
      promptId: "slide_generation",
      promptVersion: "v1",
      promptHash: promptAsset.contentHash,
      deckContextId: bundle.deckContextId,
      designSystemId: "design_001",
      slideNumber: 3,
      layoutScreenshot: "slide_03_layout.png",
      sourceMapCount: 7,
    });
    expect(pkg.prompt.includes("[APPROVED HTML LAYOUT PROTOTYPE]")).toBe(true);
    expect(pkg.prompt.includes("slide_3_chart | chart | editable true")).toBe(true);
    expect(pkg.prompt.includes("claim_001, claim_002")).toBe(true);
    expect(pkg.prompt.includes("dataset_001, dataset_002")).toBe(true);
  });

  test("includes required negative constraints and native typography instructions", () => {
    const pkg = buildSlidePromptPackage(chartSlideBundle());

    expect(pkg.prompt.includes("composition reference, not final style")).toBe(true);
    expect(
      pkg.prompt.includes("Do not reproduce the HTML layout screenshot as a literal web UI."),
    ).toBe(true);
    expect(
      pkg.prompt.includes("Do not use generic SaaS dashboard or landing page aesthetics."),
    ).toBe(true);
    expect(pkg.prompt.includes("Design negative rules: do not invent chart values")).toBe(true);
    expect(pkg.prompt.includes("- Design rule: 출처 없는 수치 시각화 금지")).toBe(true);
    expect(
      pkg.prompt.includes("Do not add new numbers, sentences, logos, or source citations."),
    ).toBe(true);
    expect(pkg.prompt.includes("[TYPOGRAPHY CONTROL]")).toBe(true);
    expect(
      pkg.prompt.includes(
        "Render title, subtitle, hero, card heading, and card support text natively in the raster per the typography control contract",
      ),
    ).toBe(true);
    expect(
      pkg.prompt.includes("Do not render body paragraphs or source-list text in the raster"),
    ).toBe(true);
    expect(
      pkg.prompt.includes("Do not render exact title, body, metric, chart, or source text"),
    ).toBe(false);
  });

  test("does not depend on original conversation history", () => {
    const { project, bundle } = approvedFixture();
    const pkg = buildSlidePromptPackage(bundle);

    expect(pkg.prompt.includes(project.initialPrompt)).toBe(false);
  });

  test("compiles slide control spec metadata for provider requests", () => {
    const pkg = buildSlidePromptPackage(chartSlideBundle());

    expect(pkg.slideControlSpec).toEqual({
      outputKind: "full_presentation_slide",
      designConsistencyContractId: pkg.designConsistency.contractId,
      designConsistencyPolicyId: "controlled-native-typography-image-generation-v6",
      layoutArchetype: "chart",
      slideRole: "Market",
      visualHierarchy: {
        title: "시장 변화가 만드는 기회",
        keyMessage: "AI 콘텐츠 제작 시장은 빠르게 확장 중",
        visualType: "막대 차트 + 인사이트 카드",
      },
      typographyControl: pkg.designConsistency.typographyControl,
      typographyZones: [
        {
          layerId: "slide_3_title",
          domRole: "title",
          typographyRole: "title",
          providerRaster: "native",
          rule: "bold but not oversized",
          bounds: { x: 96, y: 72, w: 1728, h: 140 },
        },
        {
          layerId: "slide_3_body",
          domRole: "body",
          typographyRole: "bodyParagraph",
          providerRaster: "forbidden",
          rule: "forbidden in provider raster",
          bounds: { x: 96, y: 252, w: 1728, h: 676 },
        },
        {
          layerId: "slide_3_source",
          domRole: "source",
          typographyRole: "bodyParagraph",
          providerRaster: "forbidden",
          rule: "forbidden in provider raster",
          bounds: { x: 96, y: 968, w: 1728, h: 40 },
        },
      ],
      mustPreserve: [
        "header/footer locked positions",
        "card radius/stroke/shadow family",
        "safe area top 72px right 96px bottom 72px left 96px",
        "same palette and typography fingerprints",
        "backend pipeline provenance",
        "one design consistency contract",
        "title-lock / no internal slide numbers / no accent bars",
        "bright editorial IR design layer",
        "system_consistent_varied target",
      ],
      mustAvoid: [
        "cropped_text",
        "fake_microcopy",
        "mask_leakage",
        "region_intrusion",
        "node_line_misalignment",
        "poster_only_composition",
        "visible_pasted_text_overlay",
        "bold_text_generated_then_covered",
        "awkward_repair_text_position",
        "posthoc_coverup_as_product_answer",
        "all_bold_typography",
        "thin_text_blur",
        "colored_vertical_accent_bar",
        "ai_template_stripe",
      ],
    });
    expect(pkg.prompt.includes("[SLIDE CONTROL SPEC]")).toBe(true);
    expect(pkg.prompt.includes("Layout archetype: chart")).toBe(true);
    expect(pkg.prompt.includes("Must preserve: header/footer locked positions")).toBe(true);
    expect(pkg.prompt.includes("Must avoid: cropped_text")).toBe(true);
    expect(pkg.prompt.includes("Typography zones:")).toBe(true);
    expect(
      pkg.prompt.includes("slide_3_title | title->title | raster=native | bounds 96,72,1728,140"),
    ).toBe(true);
    expect(pkg.prompt.includes("slide_3_body | body->bodyParagraph | raster=forbidden")).toBe(true);
  });
});

function chartSlideBundle(): SlideContextBundle {
  return approvedFixture().bundle;
}

function approvedFixture(): { readonly project: DeckProject; readonly bundle: SlideContextBundle } {
  const project = approvedProject();
  const contextResult = createFrozenDeckContext(project, { now: () => 1_789_500_000 });
  if (contextResult.kind !== "ready") throw new Error("Expected approved fixture context.");
  const bundleResult = buildSlideContextBundles({
    project,
    context: contextResult.context,
  });
  if (bundleResult.kind !== "ready") throw new Error("Expected slide bundles.");
  const bundle = bundleResult.bundles.find((item) => item.slideSpec.slideNumber === 3);
  if (!bundle) throw new Error("Expected chart slide bundle.");
  return { project, bundle };
}

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Slide prompt package deck", 8, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Slide Prompt Package",
    initialPrompt: "Original user prompt must not be used by slide workers",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
    stage: "GENERATING_SLIDES",
    createdAt: 1_789_500_000,
    updatedAt: 1_789_500_000,
    brief,
    research,
    plan,
    design,
    layout,
    invalidated: {},
    approvalLog: [],
  };
}
