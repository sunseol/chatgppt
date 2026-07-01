import { useNavigate } from "@tanstack/react-router";
import { ProviderCapabilityMatrix } from "@/components/deck/ProviderCapabilityMatrix";
import { ProductionResearchNetworkPolicy } from "@/components/deck/ProductionResearchNetworkPolicy";
import { ProductionResearchReview } from "@/components/deck/ProductionResearchReview";
import { ProductionResearchWebSearchLauncher } from "@/components/deck/ProductionResearchWebSearchLauncher";
import { ProductionTextWorkflowLauncher } from "@/components/deck/ProductionTextWorkflowLauncher";
import type { ProductionTextWorkflowRunStatus } from "@/components/deck/ProductionTextWorkflowPanel";
import { StageHeader, StageScroll, StageShell } from "@/components/deck/stage-shared";
import { Button } from "@/components/ui/button";
import { hashContent } from "@/lib/artifacts";
import { createClientNewProjectProviderMatrixInput } from "@/lib/client-provider-runtime-selection";
import { approveStage, updateProject } from "@/lib/deck-store";
import type { DeckProject, InterviewBrief, StepKey } from "@/lib/deck-types";
import { getDesktopAppServerBridgeStatus } from "@/lib/desktop-app-server-bridge";
import { createProviderCapabilityMatrixView } from "@/lib/provider-capability-view";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";

export type WorkflowStageProps = {
  readonly project: DeckProject;
  readonly step: StepKey;
  readonly appServerBridge?: ProductionTextWorkflowBridgeStatus;
  readonly runStatus?: ProductionTextWorkflowRunStatus;
  readonly onRunStatusChange?: (status: ProductionTextWorkflowRunStatus) => void;
  readonly onOpenConnectionSettings?: () => void;
  readonly actionLabelOverride?: string;
  readonly disabledReason?: string;
};

type ProductionStepCopy = {
  readonly num: string;
  readonly sub: string;
  readonly title: string;
  readonly status: string;
};

const PRODUCTION_STEP_COPY: Record<StepKey, ProductionStepCopy> = {
  project: {
    num: "01",
    sub: "Project",
    title: "프로젝트",
    status: "프로젝트 입력은 보존됐고 Live provider 연결을 기다리고 있습니다.",
  },
  interview: {
    num: "02",
    sub: "Interview",
    title: "인터뷰",
    status: "Production 모드에서는 local interview fixture를 실행하지 않습니다.",
  },
  research: {
    num: "03",
    sub: "Research",
    title: "조사",
    status: "Live research connector와 승인 게이트가 연결될 때까지 대기합니다.",
  },
  plan: {
    num: "04",
    sub: "Plan",
    title: "기획",
    status: "Live deck planning provider가 준비되면 승인된 조사 결과로 기획안을 생성합니다.",
  },
  design: {
    num: "05",
    sub: "Design",
    title: "디자인 시스템",
    status: "Live design provider가 준비되면 승인된 기획안을 디자인 시스템으로 변환합니다.",
  },
  layout: {
    num: "06",
    sub: "Layout",
    title: "레이아웃",
    status: "Live layout provider가 준비되면 디자인 시스템 기반 레이아웃을 생성합니다.",
  },
  generate: {
    num: "07",
    sub: "Generate",
    title: "슬라이드 이미지 생성",
    status: "Production job은 OpenAI Image provider 연결 후에만 시작됩니다.",
  },
  review: {
    num: "08",
    sub: "Review",
    title: "검토",
    status: "Live 산출물 provenance가 없는 review artifact는 승인할 수 없습니다.",
  },
  vectorize: {
    num: "09",
    sub: "Vectorize",
    title: "편집 준비",
    status: "Live editable layer provider가 준비되면 편집 가능한 레이어를 생성합니다.",
  },
  editor: {
    num: "09",
    sub: "Editor",
    title: "편집기",
    status: "Live editable layer artifact가 준비되면 편집기를 열 수 있습니다.",
  },
  export: {
    num: "10",
    sub: "Export",
    title: "내보내기",
    status: "최종 export는 Live provenance와 release gate 통과 후에만 준비됩니다.",
  },
};

export function ProductionWorkflowStage({
  project,
  step,
  appServerBridge,
  runStatus,
  onRunStatusChange,
  onOpenConnectionSettings,
  actionLabelOverride,
  disabledReason,
}: WorkflowStageProps) {
  const copy = PRODUCTION_STEP_COPY[step];
  const resolvedAppServerBridge = appServerBridge ?? getDesktopAppServerBridgeStatus();
  const providerMatrixView = createProviderCapabilityMatrixView(
    createClientNewProjectProviderMatrixInput({
      isProductionBuild: import.meta.env.PROD,
      appServerBridge: resolvedAppServerBridge,
    }),
  );

  return (
    <StageShell>
      <StageScroll className="mx-auto max-w-4xl px-8">
        <StageHeader num={copy.num} sub={copy.sub} title={copy.title} />
        <section className="border border-border bg-paper p-5 text-sm">
          <div className="font-medium">Live production gate</div>
          <div className="mt-2 text-muted-foreground">{copy.status}</div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <ProductionField label="프로젝트" value={project.name} />
            <ProductionField label="현재 단계" value={project.stage} />
            <ProductionField
              label="슬라이드"
              value={`${project.slideCount}장 · ${project.aspectRatio}`}
            />
            <ProductionField label="승인 기록" value={`${project.approvalLog.length}건`} />
          </dl>
        </section>
        <ProductionTextWorkflowLauncher
          project={project}
          step={step}
          appServerBridge={resolvedAppServerBridge}
          runStatusOverride={runStatus}
          onRunStatusChange={onRunStatusChange}
          onOpenConnectionSettings={onOpenConnectionSettings}
          actionLabelOverride={actionLabelOverride}
          disabledReason={disabledReason}
        />
        {step === "interview" && project.brief ? (
          <ProductionInterviewBriefReview project={project} brief={project.brief} />
        ) : null}
        {step === "research" ? (
          <ProductionResearchWebSearchLauncher
            project={project}
            appServerBridge={resolvedAppServerBridge}
          />
        ) : null}
        {step === "research" ? <ProductionResearchNetworkPolicy /> : null}
        {step === "research" && project.research ? (
          <ProductionResearchReview project={project} />
        ) : null}
        <div className="mt-6">
          <ProviderCapabilityMatrix view={providerMatrixView} />
        </div>
      </StageScroll>
    </StageShell>
  );
}

function ProductionInterviewBriefReview({
  project,
  brief,
}: {
  readonly project: DeckProject;
  readonly brief: InterviewBrief;
}) {
  const navigate = useNavigate();
  const approveBrief = () => {
    const approvedHash =
      brief.approvedHash ?? hashContent(JSON.stringify(stripApprovedHash(brief)));
    updateProject(project.id, { brief: { ...brief, approvedHash } });
    approveStage(project.id, "interview", "RESEARCHING", approvedHash);
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "research" },
    });
  };

  return (
    <section className="mt-6 border border-border bg-paper p-5 text-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-medium">Live interview brief review</div>
          <div className="mt-2 text-muted-foreground">
            목적, 청중, 성공 기준을 확인한 뒤 승인하면 Research Pack 생성이 열립니다.
          </div>
        </div>
        <Button
          type="button"
          disabled={brief.approvedHash !== undefined}
          onClick={approveBrief}
          className="shrink-0 bg-foreground text-background hover:bg-foreground/90"
        >
          {brief.approvedHash ? "Live brief 승인 완료" : "Live brief 승인하고 조사로 이동"}
        </Button>
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <ProductionField label="목적" value={brief.goal} />
        <ProductionField label="청중" value={brief.audience} />
        <ProductionField label="기대 행동" value={brief.desiredOutcome} />
        <ProductionField label="톤" value={brief.tone.join(", ") || "미지정"} />
        <ProductionField label="포함" value={brief.mustInclude.join(", ") || "미지정"} />
        <ProductionField label="피할 것" value={brief.mustAvoid.join(", ") || "미지정"} />
      </dl>
    </section>
  );
}

function ProductionField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border border-border bg-background px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}

function stripApprovedHash(brief: InterviewBrief): Omit<InterviewBrief, "approvedHash"> {
  return {
    id: brief.id,
    goal: brief.goal,
    audience: brief.audience,
    desiredOutcome: brief.desiredOutcome,
    slideCount: brief.slideCount,
    aspectRatio: brief.aspectRatio,
    language: brief.language,
    tone: brief.tone,
    mustInclude: brief.mustInclude,
    mustAvoid: brief.mustAvoid,
    successCriteria: brief.successCriteria,
    openQuestions: brief.openQuestions,
  };
}
