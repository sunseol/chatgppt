import { createHash } from "node:crypto";
import { encodeRgbaPngDataUrl, encodeSolidPngDataUrl } from "../../src/lib/png-encoder.ts";
import { frontendQaProject } from "../frontend-screen-qa-project.mjs";

const LAYOUT_PNG_DATA_URL = encodeSolidPngDataUrl({
  width: 320,
  height: 180,
  color: { r: 246, g: 241, b: 232, a: 255 },
});
const SLIDE_IMAGES = new Map();

export const PROJECT_STORAGE_KEY = "deckforge.projects.v1";

export const VIEWPORTS = [
  { name: "desktop", size: { width: 1440, height: 960 } },
  { name: "mobile", size: { width: 390, height: 844 } },
];

export const STEPS = [
  "project",
  "interview",
  "research",
  "plan",
  "design",
  "layout",
  "generate",
  "review",
  "vectorize",
  "editor",
  "export",
];

function paddedSlide(slideNumber) {
  return String(slideNumber).padStart(3, "0");
}

function liveHash(slideNumber) {
  return liveSlideImage(slideNumber).hash;
}

function liveSlideImage(slideNumber) {
  const cached = SLIDE_IMAGES.get(slideNumber);
  if (cached) return cached;
  const dataUrl = createGeneratedSlidePngDataUrl(slideNumber);
  const image = {
    dataUrl,
    hash: `sha256:${createHash("sha256").update(dataUrl).digest("hex")}`,
  };
  SLIDE_IMAGES.set(slideNumber, image);
  return image;
}

function liveImageArtifact(slideNumber) {
  const image = liveSlideImage(slideNumber);
  return {
    providerId: "openaiImage",
    slideNumber,
    aspectRatio: "16:9",
    canvas: { width: 1280, height: 720 },
    layoutReference: {
      screenshot: `projects/p_visual_flow/layouts/slide_${paddedSlide(slideNumber)}.png`,
      mode: "composition-reference",
    },
    imageDataUrl: image.dataUrl,
    prompt: {
      id: "slide_generation",
      version: "v1",
      hash: `sha256:prompt_${slideNumber}`,
    },
    request: {
      model: "gpt-image-2",
      requestId: `img_req_visual_${paddedSlide(slideNumber)}`,
    },
    generatedAt: 1_789_700_100,
  };
}

function imageProvenance(slideNumber) {
  return {
    artifactId: `p_visual_flow_image_slide_${paddedSlide(slideNumber)}_v1`,
    executionMode: "production",
    providerKind: "openaiImage",
    authMode: "api_key",
    modelOrRuntime: "gpt-image-2",
    promptVersion: "slide_generation@v1",
    durationMs: 1_000,
    inputArtifactIds: [`sha256:prompt_${slideNumber}`, "plan_frontend_qa"],
    fixture: false,
    requestId: `img_req_visual_${paddedSlide(slideNumber)}`,
  };
}

function storedImageArtifact(slideNumber) {
  const artifact = liveImageArtifact(slideNumber);
  return {
    binary: {
      artifactId: `p_visual_flow_image_slide_${paddedSlide(slideNumber)}_v1`,
      path: `projects/p_visual_flow/slides/images/slide_${paddedSlide(slideNumber)}.v1.png`,
      hash: liveHash(slideNumber),
      bytes: 68,
      createdAt: 1_789_700_100,
    },
    metadata: {
      path: `projects/p_visual_flow/slides/images/slide_${paddedSlide(slideNumber)}.v1.metadata.json`,
      providerId: "openaiImage",
      slideNumber,
      aspectRatio: "16:9",
      canvas: artifact.canvas,
      layoutReference: artifact.layoutReference,
      prompt: artifact.prompt,
      request: artifact.request,
      generatedAt: artifact.generatedAt,
    },
    provenance: imageProvenance(slideNumber),
  };
}

function liveComposition(slideNumber) {
  const image = liveSlideImage(slideNumber);
  const title = slideNumber === 1 ? "Workflow bottleneck" : "Verified creation path";
  const body =
    slideNumber === 1
      ? "Hidden state creates repeated checks, layout risk, and approval drift."
      : "Source-backed stages keep the final PPT editable and reviewable.";
  const source = slideNumber === 1 ? "Sources: src_flow_1" : "Sources: src_flow_2";
  return {
    slideNumber,
    exportBasis: "compositor",
    canvas: { width: 1280, height: 720 },
    backgroundProviderId: "openaiImage",
    backgroundArtifact: {
      artifactId: `p_visual_flow_image_slide_${paddedSlide(slideNumber)}_v1`,
      path: `projects/p_visual_flow/slides/images/slide_${paddedSlide(slideNumber)}.v1.png`,
      hash: liveHash(slideNumber),
    },
    overlayRoles: ["title", "body", "chart", "source"],
    overlayBounds: liveOverlayBounds(slideNumber),
    svg: liveCompositionSvg({ slideNumber, imageDataUrl: image.dataUrl, title, body, source }),
    previewPngDataUrl: image.dataUrl,
  };
}

function createGeneratedSlidePngDataUrl(slideNumber) {
  const width = 320;
  const height = 180;
  const rgba = new Uint8Array((1 + width * 4) * height);
  const palette =
    slideNumber === 1
      ? {
          base: { r: 244, g: 238, b: 227, a: 255 },
          panel: { r: 255, g: 250, b: 241, a: 255 },
          accent: { r: 196, g: 111, b: 38, a: 255 },
          ink: { r: 31, g: 39, b: 53, a: 255 },
          soft: { r: 99, g: 113, b: 130, a: 255 },
        }
      : {
          base: { r: 237, g: 244, b: 241, a: 255 },
          panel: { r: 250, g: 253, b: 249, a: 255 },
          accent: { r: 44, g: 139, b: 103, a: 255 },
          ink: { r: 31, g: 39, b: 53, a: 255 },
          soft: { r: 96, g: 116, b: 128, a: 255 },
        };

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 4);
    rgba[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const drift = Math.round((x / width) * 10 + (y / height) * 8);
      setPixel(rgba, width, x, y, {
        r: Math.min(255, palette.base.r + drift),
        g: Math.min(255, palette.base.g + Math.round(drift / 2)),
        b: Math.min(255, palette.base.b + drift),
        a: 255,
      });
    }
  }

  drawRect(rgba, width, height, 18, 20, 126, 122, palette.panel);
  drawRect(rgba, width, height, 166, 26, 132, 104, { ...palette.panel, a: 235 });
  drawRect(rgba, width, height, 34, 38, 76, 8, { ...palette.accent, a: 230 });
  drawRect(rgba, width, height, 34, 58, 92, 6, { ...palette.ink, a: 185 });
  drawRect(rgba, width, height, 34, 74, 62, 6, { ...palette.soft, a: 170 });
  drawRect(rgba, width, height, 34, 96, 92, 26, { ...palette.accent, a: 45 });

  const bars = slideNumber === 1 ? [36, 58, 42, 78] : [42, 60, 82, 96];
  bars.forEach((barHeight, index) => {
    drawRect(
      rgba,
      width,
      height,
      184 + index * 24,
      128 - barHeight,
      14,
      barHeight,
      index === bars.length - 1 ? palette.accent : { ...palette.soft, a: 190 },
    );
  });
  drawRect(rgba, width, height, 176, 132, 108, 3, { ...palette.ink, a: 150 });
  drawRect(rgba, width, height, 24, 154, 272, 2, { ...palette.ink, a: 45 });
  return encodeRgbaPngDataUrl({ width, height, rgba });
}

function liveOverlayBounds(slideNumber) {
  return [
    {
      id: `title_${slideNumber}`,
      role: "title",
      bounds: { x: 86, y: 76, w: 760, h: 96 },
    },
    {
      id: `body_${slideNumber}`,
      role: "body",
      bounds: { x: 88, y: 184, w: 620, h: 112 },
    },
    {
      id: `chart_${slideNumber}`,
      role: "chart",
      bounds: { x: 760, y: 180, w: 380, h: 282 },
    },
    {
      id: `source_${slideNumber}`,
      role: "source",
      bounds: { x: 86, y: 632, w: 620, h: 34 },
    },
  ];
}

function liveCompositionSvg({ slideNumber, imageDataUrl, title, body, source }) {
  const chartBars = slideNumber === 1 ? [120, 180, 138, 232] : [126, 168, 222, 252];
  return [
    `<svg data-final-slide="${slideNumber}" data-export-basis="compositor" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">`,
    `<image data-role="generated-background" data-locked="true" href="${imageDataUrl}" data-background-artifact-id="p_visual_flow_image_slide_${paddedSlide(slideNumber)}_v1" data-background-artifact-path="projects/p_visual_flow/slides/images/slide_${paddedSlide(slideNumber)}.v1.png" data-background-artifact-hash="${liveHash(slideNumber)}" x="0" y="0" width="1280" height="720" preserveAspectRatio="xMidYMid slice" />`,
    `<rect x="56" y="52" width="1168" height="616" rx="10" fill="#fffaf1" opacity="0.78" />`,
    `<rect x="730" y="146" width="450" height="360" rx="8" fill="#f6f1e7" opacity="0.9" />`,
    `<g data-role="editable-overlays">`,
    `<text data-editable-layer="title_${slideNumber}" data-layer-type="text" data-role="title" x="86" y="134" font-family="Georgia, serif" font-size="54" fill="#202735">${escapeXml(title)}</text>`,
    `<text data-editable-layer="body_${slideNumber}" data-layer-type="text" data-role="body" x="88" y="214" font-family="Inter, Arial, sans-serif" font-size="28" fill="#4f5968">${escapeXml(body)}</text>`,
    `<g data-editable-layer="chart_${slideNumber}" data-layer-type="shape" data-role="chart">`,
    `<line x1="782" y1="438" x2="1110" y2="438" stroke="#202735" stroke-width="3" opacity="0.55" />`,
    ...chartBars.map(
      (height, index) =>
        `<rect x="${812 + index * 72}" y="${438 - height}" width="34" height="${height}" rx="5" fill="${index === chartBars.length - 1 ? "#c87324" : "#637182"}" opacity="${index === chartBars.length - 1 ? "0.95" : "0.72"}" />`,
    ),
    `</g>`,
    `<text data-editable-layer="source_${slideNumber}" data-layer-type="text" data-role="source" x="86" y="650" font-family="Inter, Arial, sans-serif" font-size="18" fill="#687181">${escapeXml(source)}</text>`,
    `</g>`,
    `</svg>`,
  ].join("");
}

function drawRect(rgba, width, height, x, y, w, h, color) {
  for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy += 1) {
    for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx += 1) {
      blendPixel(rgba, width, xx, yy, color);
    }
  }
}

function setPixel(rgba, width, x, y, color) {
  const offset = y * (1 + width * 4) + 1 + x * 4;
  rgba[offset] = color.r;
  rgba[offset + 1] = color.g;
  rgba[offset + 2] = color.b;
  rgba[offset + 3] = color.a;
}

function blendPixel(rgba, width, x, y, color) {
  const offset = y * (1 + width * 4) + 1 + x * 4;
  const alpha = color.a / 255;
  rgba[offset] = Math.round(color.r * alpha + rgba[offset] * (1 - alpha));
  rgba[offset + 1] = Math.round(color.g * alpha + rgba[offset + 1] * (1 - alpha));
  rgba[offset + 2] = Math.round(color.b * alpha + rgba[offset + 2] * (1 - alpha));
  rgba[offset + 3] = 255;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function visualLayers(slideNumber) {
  const title = slideNumber === 1 ? "Workflow bottleneck" : "Verified creation path";
  const body =
    slideNumber === 1
      ? "Hidden state creates repeated checks, layout risk, and approval drift."
      : "Source-backed stages keep the final PPT editable and reviewable.";
  const source = slideNumber === 1 ? "Sources: src_flow_1" : "Sources: src_flow_2";
  return {
    slideNumber,
    layers: [
      {
        id: `bg_${slideNumber}`,
        type: "shape",
        role: "background",
        bounds: { x: 0, y: 0, w: 1280, h: 720 },
        editable: false,
      },
      {
        id: `title_${slideNumber}`,
        type: "text",
        role: "title",
        text: title,
        bounds: { x: 86, y: 76, w: 760, h: 96 },
        editable: true,
      },
      {
        id: `body_${slideNumber}`,
        type: "text",
        role: "body",
        text: body,
        bounds: { x: 88, y: 184, w: 620, h: 112 },
        editable: true,
      },
      {
        id: `chart_${slideNumber}`,
        type: "shape",
        role: "chart",
        bounds: { x: 760, y: 180, w: 380, h: 282 },
        editable: true,
      },
      {
        id: `source_${slideNumber}`,
        type: "text",
        role: "source",
        text: source,
        bounds: { x: 86, y: 632, w: 620, h: 34 },
        editable: true,
      },
    ],
  };
}

const visualQaResearch = {
  id: "research_frontend_qa",
  approvedHash: "research_hash",
  sources: [
    {
      id: "src_flow_1",
      title: "Workflow state visibility benchmark",
      publisher: "DeckForge QA",
      year: 2026,
      url: "https://example.test/deckforge/workflow",
      sourceType: "original_data",
      grade: "A",
      usePolicy: "priority",
    },
    {
      id: "src_flow_2",
      title: "Editable export acceptance benchmark",
      publisher: "DeckForge QA",
      year: 2026,
      url: "https://example.test/deckforge/export",
      sourceType: "original_data",
      grade: "A",
      usePolicy: "priority",
    },
  ],
  datasets: [],
  charts: [],
  claims: [
    {
      id: "claim_flow_1",
      statement: "Workflow state must remain visible through each approval gate.",
      sourceIds: ["src_flow_1"],
      datasetIds: [],
      confidence: "high",
      hasNumber: false,
      needsUserReview: false,
      status: "supported",
      slideCandidates: [1],
      numericEvidence: [],
    },
    {
      id: "claim_flow_2",
      statement: "Final exports must preserve editable user-facing output.",
      sourceIds: ["src_flow_2"],
      datasetIds: [],
      confidence: "high",
      hasNumber: false,
      needsUserReview: false,
      status: "supported",
      slideCandidates: [2],
      numericEvidence: [],
    },
  ],
  factCheckReport: {
    summary: "Visual QA fixture claims are source-backed.",
    generatedAt: 1_789_700_100,
    fatalIssueCount: 0,
    issues: [],
    uncertainItems: [],
  },
};

export const visualQaProject = {
  ...structuredClone(frontendQaProject),
  id: "p_visual_flow",
  name: "Visual Full Flow QA",
  stage: "EXPORT_READY",
  research: visualQaResearch,
  plan: {
    ...frontendQaProject.plan,
    slides: frontendQaProject.plan.slides.map((slide) => ({
      ...slide,
      evidence: [`claim_flow_${slide.number}`],
      editableElements: ["title", "body", "chart", "source"],
    })),
  },
  layout: {
    ...frontendQaProject.layout,
    slides: frontendQaProject.layout.slides.map((slide) => ({
      ...slide,
      layoutPngDataUrl: LAYOUT_PNG_DATA_URL,
    })),
  },
  approvalLog: [...frontendQaProject.approvalLog, { stage: "editor", at: 7, hash: "h_editor" }],
  liveTextArtifacts: [
    {
      artifactId: "p_visual_flow_plan_live",
      projectId: "p_visual_flow",
      artifactType: "deck_plan",
      version: 1,
      hash: "sha256:visual_plan",
      path: "projects/p_visual_flow/plans/p_visual_flow_plan_live.json",
      createdAt: 1_789_700_100,
      turnId: "turn_visual_plan",
      threadId: "thread_visual_qa",
    },
  ],
  liveSlideGeneration: {
    version: 1,
    generatedAt: 1_789_700_100,
    artifacts: [liveImageArtifact(1), liveImageArtifact(2)],
    storedArtifacts: [storedImageArtifact(1), storedImageArtifact(2)],
    compositions: [liveComposition(1), liveComposition(2)],
    providerLineage: [imageProvenance(1), imageProvenance(2)],
  },
  layers: [visualLayers(1), visualLayers(2)],
};
