import { describe, expect, test } from "bun:test";
import type { DeckProject, EditableLayerModel } from "./deck-types";
import { buildPptxCompatibilityExport } from "./pptx-project-export";
import { encodeSolidPngDataUrl } from "./png-encoder";

describe("PPTX compatibility export", () => {
  test("reports editability quality and emits slide content type metadata", () => {
    const result = buildPptxCompatibilityExport({
      project: pptxProjectFixture(),
      layers: pptxLayerFixture(),
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.file.slideWidthEmu).toBe(12_192_000);
    expect(result.file.slideHeightEmu).toBe(6_858_000);
    expect(result.quality).toEqual({
      totalLayerCount: 3,
      editableLayerCount: 2,
      fallbackCount: 1,
      score: 67,
      outcome: "medium",
      warnings: ["fallback_layers_present", "unsupported_dynamic_layers"],
    });

    const entries = readStoredZipEntries(result.file.dataUrl);
    expect(entries.has("[Content_Types].xml")).toBe(true);
    expect(entries.has("_rels/.rels")).toBe(true);
    expect(entries.has("ppt/presentation.xml")).toBe(true);
    expect(entries.has("ppt/slides/slide1.xml")).toBe(true);
    expect(entries.has("ppt/slides/_rels/slide1.xml.rels")).toBe(true);
    expect(entries.has("ppt/slideLayouts/slideLayout1.xml")).toBe(true);
    expect(entries.has("ppt/slideMasters/slideMaster1.xml")).toBe(true);
    expect(entries.has("ppt/theme/theme1.xml")).toBe(true);

    const contentTypes = entries.get("[Content_Types].xml") ?? "";
    const presentation = entries.get("ppt/presentation.xml") ?? "";
    const slide = entries.get("ppt/slides/slide1.xml") ?? "";
    expect(
      contentTypes.includes(
        'PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"',
      ),
    ).toBe(true);
    expect(presentation.includes('<p:sldSz cx="12192000" cy="6858000" type="wide"/>')).toBe(true);
    expect(slide.includes('<a:off x="731520" y="914400"/>')).toBe(true);
    expect(slide.includes('<a:ext cx="3048000" cy="914400"/>')).toBe(true);
  });

  test("embeds GPT image generation output as locked slide backgrounds", () => {
    // Given
    const project = {
      ...pptxProjectFixture(),
      liveSlideGeneration: {
        version: 1,
        generatedAt: 1_789_900_000,
        artifacts: [
          {
            providerId: "openaiImage",
            slideNumber: 1,
            aspectRatio: "16:9",
            canvas: { width: 1600, height: 900 },
            layoutReference: {
              screenshot: "projects/pptx_project/layouts/slide_001.png",
              mode: "composition-reference",
            },
            imageDataUrl: encodeSolidPngDataUrl({
              width: 2,
              height: 2,
              color: { r: 32, g: 64, b: 96, a: 255 },
            }),
            prompt: {
              id: "slide_generation",
              version: "slide_generation@v1",
              hash: "sha256:prompt",
            },
            request: {
              model: "gpt-image-2",
              requestId: "img_req_001",
            },
            generatedAt: 1_789_900_000,
          },
        ],
        storedArtifacts: [],
        compositions: [],
        providerLineage: [],
      },
    } satisfies DeckProject;

    // When
    const result = buildPptxCompatibilityExport({
      project,
      layers: pptxLayerFixture(),
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.file.backgroundImageCount).toBe(1);
    const entries = readStoredZipEntries(result.file.dataUrl);
    expect(entries.has("ppt/media/slide_001_background.png")).toBe(true);
    expect(entries.get("[Content_Types].xml")?.includes('Extension="png"')).toBe(true);
    expect(
      entries
        .get("ppt/slides/_rels/slide1.xml.rels")
        ?.includes(
          'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/slide_001_background.png"',
        ),
    ).toBe(true);
    expect(entries.get("ppt/slides/slide1.xml")?.includes('<a:blip r:embed="rId2"/>')).toBe(true);
  });
});

function readStoredZipEntries(dataUrl: string): Map<string, string> {
  const encoded = dataUrl.split(",")[1] ?? "";
  const bytes = Buffer.from(encoded, "base64");
  expect(bytes[0]).toBe(0x50);
  expect(bytes[1]).toBe(0x4b);

  const entries = new Map<string, string>();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const method = bytes.readUInt16LE(offset + 8);
    const compressedSize = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    const path = bytes.subarray(nameStart, nameStart + nameLength).toString("utf8");
    const content = bytes.subarray(contentStart, contentStart + compressedSize).toString("utf8");

    expect(method).toBe(0);
    entries.set(path, content);
    offset = contentStart + compressedSize;
  }
  expect(bytes.readUInt32LE(offset)).toBe(0x02014b50);
  return entries;
}

function pptxProjectFixture(): DeckProject {
  return {
    id: "pptx_project",
    name: "PPTX Project",
    initialPrompt: "Make a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "FINAL_REPORTING",
    createdAt: 1,
    updatedAt: 2,
    design: {
      id: "design",
      canvas: { ratio: "16:9", w: 1600, h: 900, safeMargin: { x: 96, y: 72 } },
      grid: { columns: 12, gutter: 24 },
      colors: {
        background: "#ffffff",
        textPrimary: "#111827",
        textSecondary: "#4b5563",
        primary: "#2563eb",
        secondary: "#14b8a6",
        accent: "#f97316",
      },
      typography: {
        titleStyle: "bold",
        bodyStyle: "regular",
        title: { style: "bold", minPx: 44, maxPx: 72 },
        body: { style: "regular", minPx: 24, maxPx: 34 },
        caption: { style: "regular", minPx: 14, maxPx: 18 },
        number: { style: "mono", minPx: 20, maxPx: 28 },
      },
      layoutRules: [],
      componentRules: [],
      visualLanguage: "clean",
      negativeRules: [],
      approvedHash: "sha256:design",
    },
    invalidated: {},
    approvalLog: [],
  };
}

function pptxLayerFixture(): readonly EditableLayerModel[] {
  return [
    {
      slideNumber: 1,
      layers: [
        {
          id: "title",
          type: "text",
          role: "title",
          text: "Title",
          bounds: { x: 96, y: 120, w: 400, h: 120 },
          editable: true,
        },
        {
          id: "panel",
          type: "shape",
          role: "visual",
          bounds: { x: 520, y: 220, w: 360, h: 220 },
          editable: true,
        },
        {
          id: "chart",
          type: "chart",
          role: "chart",
          bounds: { x: 900, y: 220, w: 360, h: 220 },
          editable: true,
        },
      ],
    },
  ];
}
