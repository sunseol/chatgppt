import { describe, expect, test } from "bun:test";
import { createLayoutIrFromPlan, renderLayoutIrToPrototype } from "./layout-ir";
import { renderLocalLayoutArtifacts } from "./layout-html-renderer";
import { countDomLayerMetadataOmissions } from "./dom-layer-metadata";
import { mockBrief, mockDesign, mockPlan, mockResearch } from "./mock-ai";

describe("DOM layer metadata and bounds", () => {
  test("renders complete canvas-space metadata for every DOM layer", () => {
    const ir = validLayoutIr();
    const layout = renderLayoutIrToPrototype(ir);

    expect(countDomLayerMetadataOmissions(layout)).toBe(0);
    expect(layout.slides.every((slide) => slide.domLayers.every((layer) => layer.editable))).toBe(
      true,
    );
    expect(
      layout.slides.every((slide) =>
        slide.domLayers.every((layer) => layer.bounds.w > 0 && layer.bounds.h > 0),
      ),
    ).toBe(true);
  });

  test("preserves source and dataset ids on chart layers", () => {
    const layout = renderLayoutIrToPrototype(validLayoutIr());
    const chartLayer = layout.slides
      .find((slide) => slide.number === 3)
      ?.domLayers.find((layer) => layer.role === "chart");

    expect(chartLayer?.sourceIds).toEqual(["claim_001", "claim_002"]);
    expect(chartLayer?.datasetIds).toEqual(["dataset_001"]);
  });

  test("keeps local render artifact metadata complete", () => {
    const artifacts = renderLocalLayoutArtifacts(validLayoutIr());

    expect(artifacts.slides.every((slide) => countDomLayerMetadataOmissions(slide) === 0)).toBe(
      true,
    );
  });

  test("matches canvas coordinate snapshot for a chart slide", () => {
    const layout = renderLayoutIrToPrototype(validLayoutIr());
    const slide = layout.slides.find((item) => item.number === 3);

    expect(
      slide?.domLayers.map((layer) => ({ id: layer.id, role: layer.role, bounds: layer.bounds })),
    ).toEqual([
      { id: "slide_3_title", role: "title", bounds: { x: 96, y: 72, w: 1728, h: 140 } },
      { id: "slide_3_chart", role: "chart", bounds: { x: 96, y: 252, w: 1728, h: 676 } },
      { id: "slide_3_body", role: "body", bounds: { x: 96, y: 252, w: 1728, h: 676 } },
      { id: "slide_3_source", role: "source", bounds: { x: 96, y: 968, w: 1728, h: 40 } },
    ]);
  });
});

function validLayoutIr() {
  const brief = mockBrief("DOM metadata pitch deck", 8, "16:9");
  const research = mockResearch(brief);
  const plan = { ...mockPlan(brief, research), approvedHash: "sha256:approved-plan" };
  const design = { ...mockDesign(brief, plan), approvedHash: "sha256:approved-design" };
  return createLayoutIrFromPlan({ plan, design });
}
