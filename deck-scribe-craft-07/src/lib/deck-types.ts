import type { ResearchPack } from "./research-types";
import type { LayoutValidationReport } from "./layout-validation";
import type { WorkflowErrorRecord } from "./workflow-error-types";

export type {
  ChartType,
  Claim,
  ClaimConfidence,
  ClaimStatus,
  FactCheckIssue,
  FactCheckReport,
  NumericEvidence,
  ResearchChart,
  ResearchDataset,
  ResearchDatasetRow,
  ResearchPack,
  ResearchSourceType,
  Source,
  SourceGrade,
  SourceUsePolicy,
  UsableSourceGrade,
} from "./research-types";
export type {
  WorkflowDraftRecovery,
  WorkflowErrorKind,
  WorkflowErrorRecord,
} from "./workflow-error-types";

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
  { key: "research", label: "조사", sub: "출처와 주장 확인" },
  { key: "plan", label: "기획", sub: "슬라이드 구조" },
  { key: "design", label: "디자인 시스템", sub: "색상과 글꼴" },
  { key: "layout", label: "레이아웃", sub: "배치 초안" },
  { key: "generate", label: "생성", sub: "슬라이드 이미지" },
  { key: "review", label: "검토", sub: "수정과 승인" },
  { key: "vectorize", label: "편집 준비", sub: "자동 레이어 준비" },
  { key: "editor", label: "편집기", sub: "캔버스 편집" },
  { key: "export", label: "내보내기", sub: "최종 파일" },
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

export interface SlideSpec {
  number: number;
  title: string;
  role: string;
  coreMessage: string;
  bodyPoints?: string[];
  visualType: string;
  visualComposition?: string;
  evidence: string[];
  editableElements: string[];
  dataSourceConstraints?: string[];
}

export interface DeckPlan {
  id: string;
  markdown: string;
  slides: SlideSpec[];
  approvedHash?: string;
}

export interface DesignSystem {
  id: string;
  canvas: {
    ratio: "16:9" | "4:3";
    w: number;
    h: number;
    safeMargin: { x: number; y: number };
  };
  grid: { columns: number; gutter: number };
  colors: {
    background: string;
    textPrimary: string;
    textSecondary: string;
    primary: string;
    secondary: string;
    accent: string;
  };
  typography: {
    titleStyle: string;
    bodyStyle: string;
    title: { style: string; minPx: number; maxPx: number };
    body: { style: string; minPx: number; maxPx: number };
    caption: { style: string; minPx: number; maxPx: number };
    number: { style: string; minPx: number; maxPx: number };
  };
  layoutRules: string[];
  componentRules: string[];
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
    layoutPngDataUrl?: string;
    domLayers: {
      id: string;
      role: string;
      editable: boolean;
      sourceIds: string[];
      datasetIds: string[];
      bounds: { x: number; y: number; w: number; h: number };
    }[];
  }[];
  validationReport?: LayoutValidationReport;
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
    groupId?: string;
    bounds: { x: number; y: number; w: number; h: number };
    editable: boolean;
  }[];
}

export interface ApprovalLogEntry {
  stage: string;
  at: number;
  hash: string;
  artifactId?: string;
  artifactVersion?: number;
  artifactType?: string;
}

export interface ProjectExportSummary {
  readonly artifactId: string;
  readonly artifactHash: string;
  readonly artifactPath: string;
  readonly createdAt: number;
  readonly pngCount: number;
  readonly svgCount: number;
  readonly hybridSvgCount: number;
  readonly projectFilePath: string;
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
  exportPackage?: ProjectExportSummary;

  invalidated: Partial<Record<StepKey, boolean>>;
  workflowErrors?: readonly WorkflowErrorRecord[];
  approvalLog: ApprovalLogEntry[];
}

export function stageToStep(stage: Stage): StepKey {
  switch (stage) {
    case "PROJECT_CREATED":
      return "project";
    case "INTERVIEWING":
    case "INTERVIEW_APPROVAL_PENDING":
      return "interview";
    case "RESEARCHING":
    case "RESEARCH_APPROVAL_PENDING":
      return "research";
    case "PLANNING":
    case "PLAN_APPROVAL_PENDING":
      return "plan";
    case "DESIGNING":
    case "DESIGN_APPROVAL_PENDING":
      return "design";
    case "PROTOTYPING_LAYOUT":
    case "LAYOUT_APPROVAL_PENDING":
      return "layout";
    case "GENERATING_SLIDES":
      return "generate";
    case "SLIDE_REVIEW_PENDING":
      return "review";
    case "VECTORIZE_PENDING":
    case "VECTORIZING":
    case "EDITABLE_REVIEW_PENDING":
      return "editor";
    case "EDITOR":
      return "editor";
    case "FINAL_REPORTING":
    case "EXPORT_READY":
      return "export";
  }
}

export function stepIndex(step: StepKey): number {
  return STEPS.findIndex((s) => s.key === step);
}
