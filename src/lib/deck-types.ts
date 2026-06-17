export type Stage =
  | "PROJECT_CREATED"
  | "INTERVIEWING"
  | "INTERVIEW_APPROVAL_PENDING"
  | "RESEARCHING"
  | "RESEARCH_APPROVAL_PENDING"
  | "PLANNING"
  | "PLAN_APPROVAL_PENDING"
  | "DESIGNING"
  | "DESIGN_APPROVAL_PENDING"
  | "PROTOTYPING_LAYOUT"
  | "LAYOUT_APPROVAL_PENDING"
  | "GENERATING_SLIDES"
  | "SLIDE_REVIEW_PENDING"
  | "VECTORIZE_PENDING"
  | "VECTORIZING"
  | "EDITABLE_REVIEW_PENDING"
  | "EDITOR"
  | "FINAL_REPORTING"
  | "EXPORT_READY";

export type StepKey =
  | "project"
  | "interview"
  | "research"
  | "plan"
  | "design"
  | "layout"
  | "generate"
  | "review"
  | "vectorize"
  | "editor"
  | "export";

export const STEPS: { key: StepKey; label: string; sub: string }[] = [
  { key: "project", label: "프로젝트", sub: "Brief Setup" },
  { key: "interview", label: "인터뷰", sub: "Intent Discovery" },
  { key: "research", label: "조사", sub: "Sources & Claims" },
  { key: "plan", label: "기획", sub: "Deck Plan MD" },
  { key: "design", label: "디자인 시스템", sub: "Tokens & Rules" },
  { key: "layout", label: "레이아웃", sub: "HTML Prototype" },
  { key: "generate", label: "생성", sub: "Slide Images" },
  { key: "review", label: "검토", sub: "Revise & Approve" },
  { key: "vectorize", label: "변환", sub: "Editable Layers" },
  { key: "editor", label: "편집기", sub: "Canvas Edit" },
  { key: "export", label: "내보내기", sub: "Final Report" },
];

export interface InterviewBrief {
  id: string;
  goal: string;
  audience: string;
  desiredOutcome: string;
  slideCount: number;
  aspectRatio: "16:9" | "4:3";
  language: "ko" | "en" | "mixed";
  tone: string[];
  mustInclude: string[];
  mustAvoid: string[];
  successCriteria: string[];
  openQuestions: string[];
  approvedHash?: string;
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  year: number;
  grade: "A" | "B" | "C" | "D";
  url?: string;
}

export interface Claim {
  id: string;
  statement: string;
  sourceIds: string[];
  confidence: "high" | "medium" | "low" | "assumption";
  slideCandidates: number[];
}

export interface ResearchPack {
  id: string;
  sources: Source[];
  claims: Claim[];
  approvedHash?: string;
}

export interface SlideSpec {
  number: number;
  title: string;
  role: string;
  coreMessage: string;
  visualType: string;
  evidence: string[];
  editableElements: string[];
}

export interface DeckPlan {
  id: string;
  markdown: string;
  slides: SlideSpec[];
  approvedHash?: string;
}

export interface DesignSystem {
  id: string;
  canvas: { ratio: "16:9" | "4:3"; w: number; h: number };
  colors: {
    background: string;
    textPrimary: string;
    primary: string;
    accent: string;
  };
  typography: {
    titleStyle: string;
    bodyStyle: string;
  };
  visualLanguage: string;
  negativeRules: string[];
  approvedHash?: string;
}

export interface LayoutPrototype {
  id: string;
  slides: {
    number: number;
    componentType: string;
    html: string;
    domLayers: { id: string; role: string; editable: boolean }[];
  }[];
  approvedHash?: string;
}

export interface GeneratedSlide {
  number: number;
  version: number;
  status: "pending" | "generating" | "ready" | "approved";
  imageDescriptor: string; // a descriptive scene/colors for the mock svg renderer
  notes?: string;
}

export interface EditableLayerModel {
  slideNumber: number;
  layers: {
    id: string;
    type: "text" | "shape" | "image" | "chart";
    role: string;
    text?: string;
    bounds: { x: number; y: number; w: number; h: number };
    editable: boolean;
  }[];
}

export interface DeckProject {
  id: string;
  name: string;
  initialPrompt: string;
  aspectRatio: "16:9" | "4:3";
  language: "ko" | "en" | "mixed";
  slideCount: number;
  stage: Stage;
  createdAt: number;
  updatedAt: number;

  brief?: InterviewBrief;
  research?: ResearchPack;
  plan?: DeckPlan;
  design?: DesignSystem;
  layout?: LayoutPrototype;
  slides?: GeneratedSlide[];
  layers?: EditableLayerModel[];

  invalidated: Partial<Record<StepKey, boolean>>;
  approvalLog: { stage: string; at: number; hash: string }[];
}

export function stageToStep(stage: Stage): StepKey {
  switch (stage) {
    case "PROJECT_CREATED": return "project";
    case "INTERVIEWING":
    case "INTERVIEW_APPROVAL_PENDING": return "interview";
    case "RESEARCHING":
    case "RESEARCH_APPROVAL_PENDING": return "research";
    case "PLANNING":
    case "PLAN_APPROVAL_PENDING": return "plan";
    case "DESIGNING":
    case "DESIGN_APPROVAL_PENDING": return "design";
    case "PROTOTYPING_LAYOUT":
    case "LAYOUT_APPROVAL_PENDING": return "layout";
    case "GENERATING_SLIDES": return "generate";
    case "SLIDE_REVIEW_PENDING": return "review";
    case "VECTORIZE_PENDING":
    case "VECTORIZING":
    case "EDITABLE_REVIEW_PENDING": return "vectorize";
    case "EDITOR": return "editor";
    case "FINAL_REPORTING":
    case "EXPORT_READY": return "export";
  }
}

export function stepIndex(step: StepKey): number {
  return STEPS.findIndex((s) => s.key === step);
}
