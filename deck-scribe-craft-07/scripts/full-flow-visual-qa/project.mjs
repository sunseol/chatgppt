import { frontendQaProject } from "../frontend-screen-qa-project.mjs";
import { visualQaResearch } from "./visual-research-fixture.mjs";
import {
  APPROVED_DECK_HASH,
  LAYOUT_PNG_DATA_URL,
  imageProvenance,
  liveComposition,
  liveImageArtifact,
  storedImageArtifact,
  visualLayers,
} from "./visual-slide-fixtures.mjs";

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
  slides: frontendQaProject.slides.map((slide) => ({ ...slide, status: "approved" })),
  approvalLog: [
    ...frontendQaProject.approvalLog.map((entry) =>
      entry.stage === "review"
        ? {
            ...entry,
            hash: APPROVED_DECK_HASH,
            artifactId: "p_visual_flow_review_approved_deck",
            artifactVersion: 1,
            artifactType: "slides",
          }
        : entry,
    ),
    {
      stage: "editor",
      at: 7,
      hash: "sha256:34b3c2ed66df97a32ce52766af60d7842ff26e5dc337c9b5fbab2f045b1ef0a1",
    },
  ],
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
