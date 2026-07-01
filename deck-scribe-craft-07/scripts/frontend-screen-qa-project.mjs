function backgroundLayer(slideNumber) {
  return {
    id: `bg_${slideNumber}`,
    type: "shape",
    role: "background",
    bounds: { x: 0, y: 0, w: 1280, h: 720 },
    editable: false,
  };
}

function textLayer(id, role, text, x, y, w, h) {
  return { id, type: "text", role, text, bounds: { x, y, w, h }, editable: true };
}

export const frontendQaProject = {
  id: "p_frontend_qa",
  name: "Frontend QA Project",
  initialPrompt: "Create a compact pitch deck that exercises the live DeckForge workflow UI.",
  aspectRatio: "16:9",
  language: "ko",
  slideCount: 2,
  stage: "EDITOR",
  createdAt: 1_789_700_000,
  updatedAt: 1_789_700_100,
  invalidated: {},
  approvalLog: [
    { stage: "interview", at: 1, hash: "h_interview" },
    { stage: "research", at: 2, hash: "h_research" },
    { stage: "plan", at: 3, hash: "h_plan" },
    { stage: "design", at: 4, hash: "h_design" },
    { stage: "layout", at: 5, hash: "h_layout" },
    { stage: "review", at: 6, hash: "h_review" },
  ],
  plan: {
    id: "plan_frontend_qa",
    markdown: "# Slide 1\nProblem\n# Slide 2\nSolution",
    approvedHash: "plan_hash",
    slides: [
      {
        number: 1,
        title: "Workflow bottleneck",
        role: "problem",
        coreMessage: "Research, planning, and design drift when the UI hides state.",
        bodyPoints: ["Repeated checks", "Layout risk"],
        visualType: "diagram",
        evidence: [],
        editableElements: ["title", "message"],
      },
      {
        number: 2,
        title: "Verified creation path",
        role: "solution",
        coreMessage: "Each stage keeps status visible and leaves editable output.",
        bodyPoints: ["Approval gates", "Editable canvas"],
        visualType: "workflow",
        evidence: [],
        editableElements: ["title", "message"],
      },
    ],
  },
  design: {
    id: "design_frontend_qa",
    approvedHash: "design_hash",
    canvas: { ratio: "16:9", w: 1280, h: 720, safeMargin: { x: 80, y: 60 } },
    grid: { columns: 12, gutter: 24 },
    colors: {
      background: "#f7f1e8",
      textPrimary: "#1f2735",
      textSecondary: "#687181",
      primary: "#1f2735",
      secondary: "#e8ded0",
      accent: "#b76519",
    },
    typography: {
      titleStyle: "serif",
      bodyStyle: "sans",
      title: { style: "serif", minPx: 44, maxPx: 76 },
      body: { style: "sans", minPx: 22, maxPx: 34 },
      caption: { style: "sans", minPx: 12, maxPx: 16 },
      number: { style: "mono", minPx: 28, maxPx: 48 },
    },
    layoutRules: ["Keep the workspace calm and scannable."],
    componentRules: ["Preserve editable layers."],
    visualLanguage: "Quiet desktop productivity",
    negativeRules: ["No decorative clutter."],
  },
  layout: {
    id: "layout_frontend_qa",
    approvedHash: "layout_hash",
    slides: [
      { number: 1, componentType: "hero", html: "<section>slide 1</section>", domLayers: [] },
      { number: 2, componentType: "workflow", html: "<section>slide 2</section>", domLayers: [] },
    ],
  },
  slides: [
    { number: 1, version: 1, status: "ready", imageDescriptor: "problem|title|message" },
    { number: 2, version: 1, status: "ready", imageDescriptor: "solution|title|message" },
  ],
  layers: [
    {
      slideNumber: 1,
      layers: [
        backgroundLayer(1),
        textLayer("title_1", "title", "Workflow bottleneck", 96, 120, 1088, 110),
        textLayer("msg_1", "message", "Research, planning, and design drift.", 96, 250, 1088, 80),
      ],
    },
    {
      slideNumber: 2,
      layers: [
        backgroundLayer(2),
        textLayer("title_2", "title", "Verified creation path", 96, 120, 1088, 110),
        textLayer(
          "msg_2",
          "message",
          "State stays visible through the workflow.",
          96,
          250,
          1088,
          80,
        ),
      ],
    },
  ],
};
