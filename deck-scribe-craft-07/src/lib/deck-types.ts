import type { ResearchPack } from "./research-types";
import type { LayoutValidationReport } from "./layout-validation";
import type { WorkflowErrorRecord } from "./workflow-error-types";
import type { LiveTextArtifactRecord } from "./live-text-artifact-record";
import type { ProjectExportSummary } from "./project-export-summary";
import type { ImagePathDecisionRecord } from "./image-path-decision";
import type { Stage, StepKey } from "./workflow-step-types";
import type { LiveSlideRegenerationCandidate } from "./live-slide-regeneration";
import type { SlideRevisionComparison } from "./slide-revision-generation";

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
  ResearchReinforcementRequest,
  ResearchReinforcementStatus,
  ResearchSourceType,
  ResearchReviewSourceDecision,
  ResearchReviewState,
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
export type { ProjectExportSummary } from "./project-export-summary";
export type { Stage, StepKey } from "./workflow-step-types";
export { STEPS, stageToStep, stepIndex } from "./workflow-step-types";

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

export interface LiveSlideRegenerationReviewEvidenceRef {
  readonly path: string;
  readonly slideNumber: number;
  readonly outcome: "approved" | "preserved_after_approval_blocked" | "preserved_after_failure";
}

export interface PendingLiveSlideRegenerationReview {
  readonly comparison: SlideRevisionComparison;
  readonly liveCandidate: LiveSlideRegenerationCandidate;
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
  liveTextArtifacts?: readonly LiveTextArtifactRecord[];
  imagePathDecision?: ImagePathDecisionRecord;
  liveSlideRegenerationReviewEvidence?: readonly LiveSlideRegenerationReviewEvidenceRef[];
  pendingLiveSlideRegenerationReview?: PendingLiveSlideRegenerationReview | null;

  invalidated: Partial<Record<StepKey, boolean>>;
  workflowErrors?: readonly WorkflowErrorRecord[];
  approvalLog: ApprovalLogEntry[];
}
