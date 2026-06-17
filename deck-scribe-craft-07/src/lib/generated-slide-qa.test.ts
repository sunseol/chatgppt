import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { buildBasicChartOverlays } from "./chart-overlay";
import { createFrozenDeckContext } from "./deck-context";
import { composeMvpEditableLayers } from "./editable-layer-composer";
import type { MvpEditableLayerModel } from "./editable-layer-model";
import { composeFinalSlide } from "./final-slide-compositor";
import {
  GENERATED_SLIDE_QA_THRESHOLDS,
  validateGeneratedSlideComposition,
} from "./generated-slide-qa";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import { createMockSlideImageProvider, generateSlideImage } from "./slide-image-provider";
import { buildSlidePromptPackage } from "./slide-prompt-package";
import { buildMinimalSlideSourceMap } from "./slide-source-map";

describe("generated slide basic QA", () => {
  test("passes a valid composed benchmark slide", async () => {
    const { composition, layers } = await qaFixture();
    const report = validateGeneratedSlideComposition({
      composition,
      layers,
      expectedAspectRatio: "16:9",
    });

    expect(report.status).toBe("passed");
    expect(report.metrics.sourceLessNumberCount).toBe(0);
    expect(report.metrics.structureMismatchRate).toBe(0);
  });

  test("fails source-less numeric overlay text", async () => {
    const { composition, layers } = await qaFixture((model) => ({
      ...model,
      layers: model.layers.map((layer) =>
        layer.role === "body"
          ? { ...layer, text: "ARR grows 67%", sourceMapIds: [], sourceIds: [], datasetIds: [] }
          : layer,
      ),
    }));
    const report = validateGeneratedSlideComposition({
      composition,
      layers,
      expectedAspectRatio: "16:9",
    });

    expect(report.status).toBe("failed");
    expect(report.metrics.sourceLessNumberCount).toBe(1);
    expect(report.issues).toEqual([
      "Layer editable_slide_3_body contains a number without source map ids.",
    ]);
  });

  test("fails wrong aspect ratio and excessive structure mismatch", async () => {
    const { composition, layers } = await qaFixture((model) => ({
      ...model,
      layers: model.layers.map((layer) =>
        layer.role === "chart" ? { ...layer, sourceLayerId: "missing_dom_layer" } : layer,
      ),
    }));
    const report = validateGeneratedSlideComposition({
      composition,
      layers,
      expectedAspectRatio: "4:3",
    });

    expect(report.status).toBe("failed");
    expect(
      report.metrics.structureMismatchRate > GENERATED_SLIDE_QA_THRESHOLDS.structureMismatchRate,
    ).toBe(true);
    expect(
      report.issues.includes("Composition aspect ratio 16:9 does not match expected 4:3."),
    ).toBe(true);
  });
});

async function qaFixture(
  mutateLayers: (model: MvpEditableLayerModel) => MvpEditableLayerModel = (model) => model,
) {
  const { project, bundle } = approvedFixture();
  const imageResult = await generateSlideImage({
    provider: createMockSlideImageProvider({ now: () => 123 }),
    package: buildSlidePromptPackage(bundle),
    aspectRatio: "16:9",
  });
  if (imageResult.kind !== "ready") throw new Error("Expected image artifact.");
  const overlays = buildBasicChartOverlays({
    research: requireResearch(project),
    layout: requireLayout(project),
    sourceMap: buildMinimalSlideSourceMap({
      slides: requirePlan(project).slides,
      research: requireResearch(project),
    }),
  });
  const layers = mutateLayers(
    composeMvpEditableLayers({ bundle, chartOverlays: overlays.overlays }),
  );
  return {
    layers,
    composition: composeFinalSlide({ background: imageResult.artifact, layers }),
  };
}

function approvedFixture(): {
  readonly project: DeckProject;
  readonly bundle: SlideContextBundle;
} {
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
    ...mockBrief("Generated slide QA deck", 8, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Generated Slide QA",
    initialPrompt: "Create a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
    stage: "SLIDE_REVIEW_PENDING",
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

function requirePlan(project: DeckProject) {
  if (!project.plan) throw new Error("Expected plan.");
  return project.plan;
}

function requireResearch(project: DeckProject) {
  if (!project.research) throw new Error("Expected research.");
  return project.research;
}

function requireLayout(project: DeckProject) {
  if (!project.layout) throw new Error("Expected layout.");
  return project.layout;
}
