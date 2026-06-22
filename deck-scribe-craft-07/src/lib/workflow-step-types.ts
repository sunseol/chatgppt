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

export const STEPS: { readonly key: StepKey; readonly label: string; readonly sub: string }[] = [
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
    case "EDITOR":
      return "editor";
    case "FINAL_REPORTING":
    case "EXPORT_READY":
      return "export";
  }
}

export function stepIndex(step: StepKey): number {
  return STEPS.findIndex((item) => item.key === step);
}
