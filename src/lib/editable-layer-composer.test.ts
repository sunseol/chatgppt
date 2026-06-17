import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { buildBasicChartOverlays } from "./chart-overlay";
import { createFrozenDeckContext } from "./deck-context";
import { composeMvpEditableLayers, scoreMvpEditability } from "./editable-layer-composer";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import { buildMinimalSlideSourceMap } from "./slide-source-map";

describe("DOM MVP editable layer composition", () => {
  test("composes editable title, body, source, and chart overlays from DOM metadata", () => {
    const { bundle, project } = approvedFixture();
    const overlays = buildBasicChartOverlays({
      research: requireResearch(project),
      layout: requireLayout(project),
      sourceMap: buildMinimalSlideSourceMap({
        slides: requirePlan(project).slides,
        research: requireResearch(project),
      }),
    });
    const model = composeMvpEditableLayers({ bundle, chartOverlays: overlays.overlays });

    const title = model.layers.find((layer) => layer.role === "title");
    const body = model.layers.find((layer) => layer.role === "body");
    const chart = model.layers.find((layer) => layer.role === "chart");
    const source = model.layers.find((layer) => layer.role === "source");

    expect(title?.text).toBe("시장 변화가 만드는 기회");
    expect(body?.text).toBe("AI 콘텐츠 제작 시장은 빠르게 확장 중");
    expect(source?.text?.includes("src_003")).toBe(true);
    expect(chart?.type).toBe("chart");
    expect(chart?.sourceLayerId).toBe("slide_3_chart");
    expect(chart?.chartOverlayId).toBe("overlay_chart_001_slide_03");
    expect(chart?.datasetIds).toEqual(["dataset_001"]);
    expect(chart?.sourceMapIds).toEqual(bundle.sourceMap.sourceMapIds);
  });

  test("scores Level 2 editability without PNG analysis", () => {
    const { bundle } = approvedFixture();
    const model = composeMvpEditableLayers({ bundle, chartOverlays: [] });
    const score = scoreMvpEditability([model]);

    expect(score).toEqual({
      qualityLevel: "level2",
      titleEditableRate: 1,
      bodyEditableRate: 1,
      passed: true,
    });
  });
});

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
    ...mockBrief("Editable overlay deck", 8, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Editable Layers",
    initialPrompt: "Create a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
    stage: "VECTORIZING",
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
