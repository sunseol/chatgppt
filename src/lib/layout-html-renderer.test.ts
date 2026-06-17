import { describe, expect, test } from "bun:test";
import { createLayoutIrFromPlan } from "./layout-ir";
import { renderLocalLayoutArtifacts, safeRenderLocalLayoutArtifacts } from "./layout-html-renderer";
import { mockBrief, mockDesign, mockPlan, mockResearch } from "./mock-ai";

describe("local layout HTML renderer", () => {
  test("renders every Layout IR slide with deterministic HTML, CSS, DOM metadata, and PNG preview", () => {
    const ir = validLayoutIr();

    const artifacts = renderLocalLayoutArtifacts(ir);

    expect(artifacts.css.includes(".deckforge-layout-slide")).toBe(true);
    expect(artifacts.manifest.slideCount).toBe(ir.slides.length);
    expect(artifacts.manifest.canvas.ratio).toBe("16:9");
    expect(artifacts.slides.length).toBe(ir.slides.length);
    expect(artifacts.slides.every((slide) => slide.width / slide.height === 16 / 9)).toBe(true);
    expect(
      artifacts.slides.every((slide) => slide.pngDataUrl.startsWith("data:image/png;base64,")),
    ).toBe(true);
    expect(artifacts.slides.every((slide) => slide.html.includes("<!doctype html>"))).toBe(true);
    expect(artifacts.slides.every((slide) => slide.domLayers.length > 0)).toBe(true);
  });

  test("renders the same Layout IR to identical artifacts", () => {
    const ir = validLayoutIr();

    const first = renderLocalLayoutArtifacts(ir);
    const second = renderLocalLayoutArtifacts(ir);

    expect(second).toEqual(first);
  });

  test("returns failed render result for invalid Layout IR and recovers on retry", () => {
    const ir = validLayoutIr();
    const failed = safeRenderLocalLayoutArtifacts({ ...ir, slides: [] });
    const retried = safeRenderLocalLayoutArtifacts(ir);

    expect(failed.kind).toBe("failed");
    expect(retried.kind).toBe("ready");
    if (retried.kind !== "ready") return;
    expect(retried.artifacts.slides.length).toBe(ir.slides.length);
  });
});

function validLayoutIr() {
  const brief = mockBrief("Local renderer pitch deck", 8, "16:9");
  const research = mockResearch(brief);
  const plan = { ...mockPlan(brief, research), approvedHash: "sha256:approved-plan" };
  const design = { ...mockDesign(brief, plan), approvedHash: "sha256:approved-design" };
  return createLayoutIrFromPlan({ plan, design });
}
