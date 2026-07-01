import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { buildBasicChartOverlays } from "./chart-overlay";
import { createFrozenDeckContext } from "./deck-context";
import { composeMvpEditableLayers } from "./editable-layer-composer";
import { composeFinalSlide, countKoreanTextOverlays } from "./final-slide-compositor";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { encodeSolidPngDataUrl } from "./png-encoder";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import {
  createMockSlideImageProvider,
  createOpenAIImageProvider,
  generateSlideImage,
} from "./slide-image-provider";
import { buildSlidePromptPackage } from "./slide-prompt-package";
import { buildMinimalSlideSourceMap } from "./slide-source-map";

describe("final slide compositor", () => {
  test("composes locked generated background with editable overlays", async () => {
    const { project, bundle } = approvedFixture();
    const composition = await compositionFixture(project, bundle);

    const backgroundIndex = composition.svg.indexOf('data-role="generated-background"');
    const titleIndex = composition.svg.indexOf('data-editable-layer="editable_slide_3_title"');
    const chartIndex = composition.svg.indexOf('data-editable-layer="editable_slide_3_chart"');

    expect(composition.exportBasis).toBe("compositor");
    expect(composition.previewPngDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(backgroundIndex >= 0).toBe(true);
    expect(titleIndex > backgroundIndex).toBe(true);
    expect(chartIndex > backgroundIndex).toBe(true);
    expect(composition.svg.includes("시장 변화가 만드는 기회")).toBe(true);
    expect(composition.svg.includes("Sources: src_003, src_001, src_002")).toBe(true);
  });

  test("keeps Korean title and body as SVG text overlays", async () => {
    const { project, bundle } = approvedFixture();
    const composition = await compositionFixture(project, bundle);

    expect(countKoreanTextOverlays(composition)).toBe(3);
    expect(composition.svg.includes("<text")).toBe(true);
    expect(composition.svg.includes("AI 콘텐츠 제작 시장은 빠르게 확장 중")).toBe(true);
    expect(composition.svg.includes('data-locked="true"')).toBe(true);
  });

  test("records background provider and editable overlay metadata for live review", async () => {
    const { project, bundle } = approvedFixture();
    const composition = await compositionFixture(project, bundle);

    expect(composition.backgroundProviderId).toBe("mock");
    expect([...composition.overlayRoles].sort()).toEqual(["body", "chart", "source", "title"]);
    expect([...composition.overlayBounds.map((overlay) => overlay.role)].sort()).toEqual([
      "body",
      "chart",
      "source",
      "title",
    ]);
  });

  test("records stored live background artifact metadata on the compositor layer", async () => {
    const { project, bundle } = approvedFixture();
    const composition = await compositionFixture(project, bundle, {
      liveBackgroundArtifact: true,
    });

    expect(composition.backgroundProviderId).toBe("openaiImage");
    expect(composition.backgroundArtifact).toEqual({
      artifactId: "project_001_image_slide_003_v1",
      path: "projects/project_001/slides/images/slide_003.v1.png",
      hash: "sha256:live-background",
    });
    expect(
      composition.svg.includes('data-background-artifact-id="project_001_image_slide_003_v1"'),
    ).toBe(true);
    expect(
      composition.svg.includes(
        'data-background-artifact-path="projects/project_001/slides/images/slide_003.v1.png"',
      ),
    ).toBe(true);
    expect(composition.svg.includes('data-background-artifact-hash="sha256:live-background"')).toBe(
      true,
    );
  });
});

async function compositionFixture(
  project: DeckProject,
  bundle: SlideContextBundle,
  options: { readonly liveBackgroundArtifact?: boolean } = {},
) {
  const imageResult = await generateSlideImage({
    provider: options.liveBackgroundArtifact
      ? createOpenAIImageProvider({
          async generate() {
            return {
              imageDataUrl: encodeSolidPngDataUrl({
                width: 160,
                height: 90,
                color: { r: 40, g: 90, b: 160, a: 255 },
              }),
              requestId: "req_live_background_003",
              size: "1600x900",
              quality: "high",
              latencyMs: 1200,
            };
          },
        })
      : createMockSlideImageProvider({ now: () => 123 }),
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
  return composeFinalSlide({
    background: imageResult.artifact,
    layers: composeMvpEditableLayers({ bundle, chartOverlays: overlays.overlays }),
    ...(options.liveBackgroundArtifact
      ? {
          backgroundArtifact: {
            artifactId: "project_001_image_slide_003_v1",
            path: "projects/project_001/slides/images/slide_003.v1.png",
            hash: "sha256:live-background",
          },
        }
      : {}),
  });
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
    ...mockBrief("Compositor deck", 8, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Final Compositor",
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
