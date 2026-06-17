import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import type { SlideContextBundle } from "./slide-context-bundle";
import { createFrozenDeckContext } from "./deck-context";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { buildSlideContextBundles } from "./slide-context-bundle";
import {
  buildTextOverlayPromptAddendum,
  buildTextOverlayStrategy,
  reviewTextOverlayStrategy,
} from "./text-overlay-strategy";

describe("text overlay strategy", () => {
  test("classifies text, number, source, chart, and background responsibilities", () => {
    const strategy = buildTextOverlayStrategy(bundleWithMetricLayer());
    const editableRoles = strategy.layers
      .filter((layer) => layer.renderedBy === "editable-text-layer")
      .map((layer) => layer.role);
    const chartRoles = strategy.layers
      .filter((layer) => layer.renderedBy === "data-overlay-layer")
      .map((layer) => layer.role);
    const backgroundRoles = strategy.layers
      .filter((layer) => layer.renderedBy === "generated-visual-background")
      .map((layer) => layer.role);

    expect(editableRoles.includes("title")).toBe(true);
    expect(editableRoles.includes("body")).toBe(true);
    expect(editableRoles.includes("metric")).toBe(true);
    expect(editableRoles.includes("source")).toBe(true);
    expect(chartRoles).toEqual(["chart"]);
    expect(backgroundRoles).toEqual(["image"]);
  });

  test("keeps source map lineage on chart and source overlays", () => {
    const strategy = buildTextOverlayStrategy(bundleWithMetricLayer());
    const chart = strategy.layers.find((layer) => layer.role === "chart");
    const source = strategy.layers.find((layer) => layer.role === "source");

    expect(chart?.sourceMapIds).toEqual([
      "claim_001",
      "claim_002",
      "src_003",
      "src_001",
      "src_002",
      "dataset_001",
      "dataset_002",
    ]);
    expect(chart?.datasetIds).toEqual(["dataset_001"]);
    expect(source?.sourceMapIds.includes("src_001")).toBe(true);
  });

  test("builds a prompt addendum that bans exact text rendering without echoing text", () => {
    const bundle = bundleWithMetricLayer();
    const addendum = buildTextOverlayPromptAddendum(buildTextOverlayStrategy(bundle));

    expect(addendum.includes("composition reference, not final web UI")).toBe(true);
    expect(
      addendum.includes("Do not render exact title, body, metric, chart, or source text"),
    ).toBe(true);
    expect(addendum.includes(bundle.slideSpec.title)).toBe(false);
    expect(addendum.includes(bundle.slideSpec.message)).toBe(false);
  });

  test("fails review when source-backed overlay lineage is missing", () => {
    const bundle = bundleWithMetricLayer();
    const strategy = buildTextOverlayStrategy({
      ...bundle,
      sourceMap: { ...bundle.sourceMap, sourceMapIds: [] },
    });
    const review = reviewTextOverlayStrategy(strategy);

    expect(review.status).toBe("failed");
    expect(review.issues).toEqual([
      "Source-backed overlay slide_3_chart is missing source map ids.",
      "Source-backed overlay slide_3_body is missing source map ids.",
      "Source-backed overlay slide_3_source is missing source map ids.",
      "Source-backed overlay slide_3_metric is missing source map ids.",
    ]);
  });
});

function bundleWithMetricLayer(): SlideContextBundle {
  const bundle = chartSlideBundle();
  return {
    ...bundle,
    layoutPrototype: {
      ...bundle.layoutPrototype,
      domLayers: [
        ...bundle.layoutPrototype.domLayers,
        {
          id: "slide_3_metric",
          role: "metric",
          editable: true,
          sourceIds: ["claim_001"],
          datasetIds: ["dataset_001"],
          bounds: { x: 1320, y: 260, w: 400, h: 180 },
        },
        {
          id: "slide_3_image",
          role: "image",
          editable: false,
          sourceIds: [],
          datasetIds: [],
          bounds: { x: 96, y: 260, w: 320, h: 320 },
        },
      ],
    },
  };
}

function chartSlideBundle(): SlideContextBundle {
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
  return bundle;
}

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Overlay strategy deck", 8, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Text Overlay Strategy",
    initialPrompt: "Create a deck",
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
