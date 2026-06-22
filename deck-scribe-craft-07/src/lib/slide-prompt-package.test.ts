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

  test("includes required negative constraints and text overlay instructions", () => {
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
    expect(
      pkg.prompt.includes("Do not render exact title, body, metric, chart, or source text"),
    ).toBe(true);
  });

  test("does not depend on original conversation history", () => {
    const { project, bundle } = approvedFixture();
    const pkg = buildSlidePromptPackage(bundle);

    expect(pkg.prompt.includes(project.initialPrompt)).toBe(false);
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
