import { describe, expect, test } from "bun:test";
import type { Png2SvgSlideOutput, Png2SvgSpikeManifest } from "./png2svg-adapter-spike";
import { adaptPng2SvgSpikeOutput } from "./png2svg-adapter-spike";

describe("PNG2SVG adapter feasibility spike", () => {
  test("runs ten fixture outputs with ocr-engine none without Figma import", () => {
    const result = adaptPng2SvgSpikeOutput(tenFixtureManifest());

    expect(result.status).toBe("ready");
    expect(result.report.fixtureCount).toBe(10);
    expect(result.report.ocrEngine).toBe("none");
    expect(result.report.figmaImportExcluded).toBe(true);
    expect(result.report.fixtureDiffs.length).toBe(10);
    expect(
      result.report.limitations.includes("OCR unavailable; text candidates are review hints only."),
    ).toBe(true);
  });

  test("converts PNG2SVG text and region output into DeckForge draft metadata", () => {
    const result = adaptPng2SvgSpikeOutput(tenFixtureManifest());
    const firstDraft = result.editableDrafts[0];
    const firstExtensions = result.extensionLayersBySlide[0];

    expect(firstDraft?.layers.map((layer) => layer.sourceLayerId)).toEqual([
      "png2svg.text.slide_1_title",
      "png2svg.visual_region.slide_1_panel",
      "png2svg.raster_region.slide_1_photo",
    ]);
    expect(firstDraft?.layers.every((layer) => layer.qualityLevel === "level3")).toBe(true);
    expect(firstExtensions?.layers.map((layer) => layer.sourceLayerId)).toEqual([
      "png2svg.visual_region.slide_1_panel",
      "png2svg.raster_region.slide_1_photo",
    ]);
  });

  test("blocks figma import packages from the MVP adapter path", () => {
    const result = adaptPng2SvgSpikeOutput({
      ...tenFixtureManifest(),
      figmaImportPresent: true,
    });

    expect(result.status).toBe("blocked");
    expect(result.report.issues.map((issue) => issue.code)).toEqual(["figma-import-present"]);
    expect(result.editableDrafts).toEqual([]);
  });

  test("records DF-156 license handoff and visual diff coverage", () => {
    const result = adaptPng2SvgSpikeOutput(tenFixtureManifest());

    expect(result.report.licenseHandoff).toEqual({
      targetTicket: "DF-156",
      status: "blocked_for_bundle",
      reason: "PNG2SVG candidate is unlicensed in current evidence; use spike metadata only.",
    });
    expect(result.report.fixtureDiffs.every((diff) => diff.metadataComparable)).toBe(true);
    expect(result.report.fixtureDiffs.every((diff) => diff.visualDiffStatus === "stubbed")).toBe(
      true,
    );
  });
});

function tenFixtureManifest(): Png2SvgSpikeManifest {
  return {
    runId: "png2svg_spike_001",
    ocrEngine: "none",
    figmaImportPresent: false,
    slides: Array.from({ length: 10 }, (_, index) => slideOutput(index + 1)),
  };
}

function slideOutput(slideNumber: number): Png2SvgSlideOutput {
  return {
    slideNumber,
    pngPath: `fixtures/slide_${slideNumber}.png`,
    svgPath: `slides/slide_${slideNumber}.svg`,
    hybridSvgPath: `slides/slide_${slideNumber}.hybrid.svg`,
    textCandidates: [
      {
        id: `slide_${slideNumber}_title`,
        text: `Slide ${slideNumber} title`,
        bounds: { x: 100, y: 90, w: 640, h: 80 },
        confidence: 0.7,
      },
    ],
    visualRegions: [
      {
        id: `slide_${slideNumber}_panel`,
        kind: "vector",
        bounds: { x: 96, y: 220, w: 520, h: 260 },
        confidence: 0.82,
        pathData: "M 96 220 L 616 220 L 616 480 Z",
      },
    ],
    rasterRegions: [
      {
        id: `slide_${slideNumber}_photo`,
        kind: "raster",
        bounds: { x: 700, y: 240, w: 460, h: 260 },
        confidence: 0.76,
        imageDataUrl: "data:image/png;base64,AAAA",
      },
    ],
  };
}
