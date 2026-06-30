import { frontendQaProject } from "../frontend-screen-qa-project.mjs";

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l2L9WQAAAABJRU5ErkJggg==";
const LIVE_HASHES = [`sha256:${"a".repeat(64)}`, `sha256:${"b".repeat(64)}`];

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
  return LIVE_HASHES[slideNumber - 1] ?? `sha256:${"c".repeat(64)}`;
}

function liveImageArtifact(slideNumber) {
  return {
    providerId: "openaiImage",
    slideNumber,
    aspectRatio: "16:9",
    canvas: { width: 1280, height: 720 },
    layoutReference: {
      screenshot: `projects/p_visual_flow/layouts/slide_${paddedSlide(slideNumber)}.png`,
      mode: "composition-reference",
    },
    imageDataUrl: PNG_DATA_URL,
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
    overlayRoles: ["title", "message"],
    overlayBounds: [],
    svg: `<svg data-final-slide="${slideNumber}" />`,
    previewPngDataUrl: PNG_DATA_URL,
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
    })),
  },
  layout: {
    ...frontendQaProject.layout,
    slides: frontendQaProject.layout.slides.map((slide) => ({
      ...slide,
      layoutPngDataUrl: PNG_DATA_URL,
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
};
