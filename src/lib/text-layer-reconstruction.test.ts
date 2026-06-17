import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { buildBasicChartOverlays } from "./chart-overlay";
import { createFrozenDeckContext } from "./deck-context";
import { composeMvpEditableLayers } from "./editable-layer-composer";
import type { MvpEditableLayer } from "./editable-layer-model";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { buildSlideContextBundles } from "./slide-context-bundle";
import { buildMinimalSlideSourceMap } from "./slide-source-map";
import {
  reconstructTextLayers,
  scoreTextLayerReconstruction,
  validateKoreanTextIntegrity,
} from "./text-layer-reconstruction";

describe("text and font reconstruction", () => {
  test("reconstructs editable text layers with role-aware Korean-safe font candidates", () => {
    const project = approvedProject();
    const layers = benchmarkTextLayers(project);
    const reconstructed = reconstructTextLayers({
      layers,
      design: requireDesign(project),
    });

    const title = reconstructed.find((layer) => layer.role === "title");
    const body = reconstructed.find((layer) => layer.role === "body");
    const source = reconstructed.find((layer) => layer.role === "source");

    expect(title?.text).toBe("시장 변화가 만드는 기회");
    expect(title?.font.family.includes("Georgia")).toBe(true);
    expect(title?.font.sizePx).toBe(56);
    expect(body?.font.family.includes("Apple SD Gothic Neo")).toBe(true);
    expect(body?.font.lineHeight).toBe(1.42);
    expect(source?.font.sizePx).toBe(20);
    expect(source?.editable).toBe(true);
  });

  test("scores benchmark title and body reconstruction above the P0 thresholds", () => {
    const project = approvedProject();
    const reconstructed = reconstructTextLayers({
      layers: benchmarkTextLayers(project),
      design: requireDesign(project),
    });
    const score = scoreTextLayerReconstruction([reconstructed]);

    expect(score.titleEditableRate).toBe(1);
    expect(score.bodyEditableRate).toBe(1);
    expect(score.passed).toBe(true);
  });

  test("detects corrupted Korean text before it reaches export", () => {
    const project = approvedProject();
    const reconstructed = reconstructTextLayers({
      layers: [
        {
          ...benchmarkTextLayers(project)[0],
          id: "bad_text",
          text: "깨진 � 한글",
        },
      ],
      design: requireDesign(project),
    });
    const integrity = validateKoreanTextIntegrity(reconstructed);

    expect(integrity.passed).toBe(false);
    expect(integrity.corruptedLayerIds).toEqual(["bad_text"]);
  });
});

function benchmarkTextLayers(project: DeckProject): readonly MvpEditableLayer[] {
  const context = createFrozenDeckContext(project, { now: () => 1_789_500_000 });
  if (context.kind !== "ready") throw new Error("Expected frozen context.");
  const bundles = buildSlideContextBundles({ project, context: context.context });
  if (bundles.kind !== "ready") throw new Error("Expected slide bundles.");
  const bundle = bundles.bundles.find((item) => item.slideSpec.slideNumber === 3);
  if (!bundle) throw new Error("Expected benchmark slide.");
  const overlays = buildBasicChartOverlays({
    research: requireResearch(project),
    layout: requireLayout(project),
    sourceMap: buildMinimalSlideSourceMap({
      slides: requirePlan(project).slides,
      research: requireResearch(project),
    }),
  });
  return composeMvpEditableLayers({ bundle, chartOverlays: overlays.overlays }).layers.filter(
    (layer) => layer.type === "text",
  );
}

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Text reconstruction deck", 8, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Text Reconstruction",
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

function requireDesign(project: DeckProject) {
  if (!project.design) throw new Error("Expected design.");
  return project.design;
}
