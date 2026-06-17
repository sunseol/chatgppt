import { describe, expect, test } from "bun:test";
import { createLayoutIrFromPlan } from "./layout-ir";
import {
  renderLocalLayoutArtifacts,
  type LocalLayoutRenderArtifacts,
} from "./layout-html-renderer";
import { validateLayoutArtifacts } from "./layout-validation";
import { mockBrief, mockDesign, mockPlan, mockResearch } from "./mock-ai";

describe("layout validation", () => {
  test("passes the benchmark layout report for valid render artifacts", () => {
    const report = validateLayoutArtifacts(validArtifacts());

    expect(report.status).toBe("passed");
    expect(report.summary).toEqual({
      slideCount: 8,
      renderedSlideCount: 8,
      renderSuccessRate: 1,
      overflowSlideCount: 0,
      overflowSlideRate: 0,
      safeMarginBreachSlideCount: 0,
      safeMarginBreachRate: 0,
      metadataOmissionCount: 0,
    });
  });

  test("fails when render success rate drops below 100 percent", () => {
    const artifacts = validArtifacts();
    const report = validateLayoutArtifacts({ ...artifacts, slides: artifacts.slides.slice(1) });

    expect(report.status).toBe("failed");
    expect(report.summary.renderSuccessRate).toBe(0.875);
    expect(report.issues.some((issue) => issue.code === "render-missing")).toBe(true);
  });

  test("fails when overflow slide rate is above threshold", () => {
    const report = validateLayoutArtifacts(withFirstLayerBounds({ x: -1, y: 72, w: 1728, h: 140 }));

    expect(report.status).toBe("failed");
    expect(report.summary.overflowSlideRate).toBe(0.125);
    expect(report.issues.some((issue) => issue.code === "bounds-overflow")).toBe(true);
  });

  test("fails when safe margin breach rate is above threshold", () => {
    const report = validateLayoutArtifacts(withFirstLayerBounds({ x: 0, y: 72, w: 1728, h: 140 }));

    expect(report.status).toBe("failed");
    expect(report.summary.safeMarginBreachRate).toBe(0.125);
    expect(report.issues.some((issue) => issue.code === "safe-margin-breach")).toBe(true);
  });
});

function validArtifacts(): LocalLayoutRenderArtifacts {
  const brief = mockBrief("Layout validation benchmark", 8, "16:9");
  const research = mockResearch(brief);
  const plan = { ...mockPlan(brief, research), approvedHash: "sha256:approved-plan" };
  const design = { ...mockDesign(brief, plan), approvedHash: "sha256:approved-design" };
  return renderLocalLayoutArtifacts(createLayoutIrFromPlan({ plan, design }));
}

function withFirstLayerBounds(bounds: { x: number; y: number; w: number; h: number }) {
  const artifacts = validArtifacts();
  const [firstSlide, ...restSlides] = artifacts.slides;
  if (!firstSlide) throw new Error("Expected at least one rendered slide.");
  const [firstLayer, ...restLayers] = firstSlide.domLayers;
  if (!firstLayer) throw new Error("Expected at least one DOM layer.");
  return {
    ...artifacts,
    slides: [
      { ...firstSlide, domLayers: [{ ...firstLayer, bounds }, ...restLayers] },
      ...restSlides,
    ],
  };
}
