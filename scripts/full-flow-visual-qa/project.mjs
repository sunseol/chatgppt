import { frontendQaProject } from "../frontend-screen-qa-project.mjs";

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l2L9WQAAAABJRU5ErkJggg==";

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
  layout: {
    ...frontendQaProject.layout,
    slides: frontendQaProject.layout.slides.map((slide) => ({
      ...slide,
      layoutPngDataUrl: PNG_DATA_URL,
    })),
  },
  approvalLog: [...frontendQaProject.approvalLog, { stage: "editor", at: 7, hash: "h_editor" }],
};
