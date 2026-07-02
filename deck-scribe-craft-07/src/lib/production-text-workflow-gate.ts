import type { DeckProject, StepKey } from "./deck-types";

export type ProductionTextWorkflowBridgeStatus = "available" | "missing";

export type ProductionTextWorkflow = "interview" | "text_pipeline";

export type ProductionTextWorkflowStage =
  | "questions"
  | "brief"
  | "deck_plan"
  | "design_system"
  | "layout_ir";

export type ProductionTextPatchTarget = "brief" | "plan" | "design" | "layout";

export type ProductionTextWorkflowIssueCode =
  | "app_server_bridge_missing"
  | "missing_live_brief"
  | "missing_approved_research";

export type ProductionTextWorkflowIssue = {
  readonly code: ProductionTextWorkflowIssueCode;
  readonly message: string;
};

export type ProductionTextWorkflowGate =
  | { readonly kind: "not_applicable" }
  | {
      readonly kind: "blocked";
      readonly workflow: ProductionTextWorkflow;
      readonly title: string;
      readonly actionLabel: string;
      readonly requiredStages: readonly ProductionTextWorkflowStage[];
      readonly issues: readonly ProductionTextWorkflowIssue[];
    }
  | {
      readonly kind: "ready";
      readonly workflow: ProductionTextWorkflow;
      readonly title: string;
      readonly actionLabel: string;
      readonly requiredStages: readonly ProductionTextWorkflowStage[];
      readonly patchTargets: readonly ProductionTextPatchTarget[];
    };

export type ProductionTextWorkflowGateInput = {
  readonly project: DeckProject;
  readonly step: StepKey;
  readonly appServerBridge: ProductionTextWorkflowBridgeStatus;
};

const INTERVIEW_STAGES = ["questions", "brief"] as const;
const TEXT_PIPELINE_STAGES = ["deck_plan", "design_system", "layout_ir"] as const;
const TEXT_PIPELINE_PATCH_TARGETS = ["plan", "design", "layout"] as const;

export function createProductionTextWorkflowGate(
  input: ProductionTextWorkflowGateInput,
): ProductionTextWorkflowGate {
  switch (input.step) {
    case "interview":
      return interviewGate(input.appServerBridge);
    case "plan":
    case "design":
    case "layout":
      return textPipelineGate(input.project, input.appServerBridge);
    case "project":
    case "research":
    case "generate":
    case "review":
    case "vectorize":
    case "editor":
    case "export":
      return { kind: "not_applicable" };
  }
}

function interviewGate(
  appServerBridge: ProductionTextWorkflowBridgeStatus,
): ProductionTextWorkflowGate {
  const base = {
    workflow: "interview" as const,
    title: "라이브 인터뷰 실행",
    actionLabel: "라이브 인터뷰 질문지 생성",
    requiredStages: INTERVIEW_STAGES,
  };
  const issues = bridgeIssues(appServerBridge);
  if (issues.length > 0) return { kind: "blocked", ...base, issues };
  return { kind: "ready", ...base, patchTargets: ["brief"] };
}

function textPipelineGate(
  project: DeckProject,
  appServerBridge: ProductionTextWorkflowBridgeStatus,
): ProductionTextWorkflowGate {
  const base = {
    workflow: "text_pipeline" as const,
    title: "라이브 기획/디자인/레이아웃 실행",
    actionLabel: "라이브 텍스트 파이프라인 실행",
    requiredStages: TEXT_PIPELINE_STAGES,
  };
  const issues = [...bridgeIssues(appServerBridge), ...textPipelinePrerequisiteIssues(project)];
  if (issues.length > 0) return { kind: "blocked", ...base, issues };
  return { kind: "ready", ...base, patchTargets: TEXT_PIPELINE_PATCH_TARGETS };
}

function bridgeIssues(
  appServerBridge: ProductionTextWorkflowBridgeStatus,
): readonly ProductionTextWorkflowIssue[] {
  if (appServerBridge === "available") return [];
  return [
    {
      code: "app_server_bridge_missing",
      message: "라이브 실행을 시작하려면 데스크톱 Codex 연결이 필요합니다.",
    },
  ];
}

function textPipelinePrerequisiteIssues(
  project: DeckProject,
): readonly ProductionTextWorkflowIssue[] {
  return [
    ...(project.brief?.approvedHash
      ? []
      : [
          {
            code: "missing_live_brief" as const,
            message: "기획/디자인/레이아웃 실행 전에 승인된 인터뷰 브리프가 필요합니다.",
          },
        ]),
    ...(project.research?.approvedHash
      ? []
      : [
          {
            code: "missing_approved_research" as const,
            message: "기획/디자인/레이아웃 실행 전에 승인된 조사 근거가 필요합니다.",
          },
        ]),
  ];
}
