import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText, Save } from "lucide-react";
import { GateBar } from "@/components/deck/GateBar";
import {
  PlanRevisionRequest,
  PlanSlideSpecPreview,
  PlanValidationSummary,
} from "@/components/deck/PlanPanels";
import { SourceMapReviewPanel } from "@/components/deck/SourceMapReviewPanel";
import {
  EmptyAction,
  InvalidatedBanner,
  StageHeader,
  StageScroll,
  StageShell,
} from "@/components/deck/stage-shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { approveStage, updateProject } from "@/lib/deck-store";
import type { DeckPlan, DeckProject } from "@/lib/deck-types";
import { mockPlan } from "@/lib/mock-ai";
import { createApprovedPlan, createPlanDraftUpdate } from "@/lib/plan-stage-model";
import { createSlideSourceMapReview } from "@/lib/source-map-review";
import { parseDeckPlanMarkdown } from "@/lib/slide-spec-parser";
import { buildMinimalSlideSourceMap } from "@/lib/slide-source-map";

async function delay<T>(value: T, ms = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function PlanStage({ project }: { readonly project: DeckProject }) {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<DeckPlan | undefined>(project.plan);
  const [busy, setBusy] = useState(false);
  const [edited, setEdited] = useState(project.plan?.markdown ?? "");
  const [revisionRequest, setRevisionRequest] = useState("");
  const [sourceMapCorrectionRequest, setSourceMapCorrectionRequest] = useState("");
  const invalidated = !!project.invalidated.plan;

  useEffect(() => {
    setPlan(project.plan);
    setEdited(project.plan?.markdown ?? "");
  }, [project.plan]);

  const parseResult = useMemo(() => parseDeckPlanMarkdown(edited), [edited]);
  const sourceMapReview = useMemo(() => {
    if (!project.research || parseResult.specs.length === 0) return undefined;
    return createSlideSourceMapReview({
      map: buildMinimalSlideSourceMap({ slides: parseResult.specs, research: project.research }),
      research: project.research,
    });
  }, [parseResult.specs, project.research]);
  const hasUnsavedChanges = !!plan && edited !== plan.markdown;

  const persistDraft = (nextPlan: DeckPlan) => {
    const draft = createPlanDraftUpdate({ plan: nextPlan, markdown: nextPlan.markdown });
    setPlan(draft.plan);
    setEdited(draft.plan.markdown);
    updateProject(project.id, (current) => ({
      plan: draft.plan,
      stage: "PLAN_APPROVAL_PENDING",
      invalidated: { ...current.invalidated, ...draft.invalidated },
    }));
  };

  const generate = async () => {
    if (!project.brief || !project.research) return;
    setBusy(true);
    const generated = await delay(mockPlan(project.brief, project.research), 1100);
    persistDraft(generated);
    setBusy(false);
  };

  const saveEditedDraft = () => {
    if (!plan) return;
    const draft = createPlanDraftUpdate({ plan, markdown: edited });
    setPlan(draft.plan);
    updateProject(project.id, (current) => ({
      plan: draft.plan,
      stage: "PLAN_APPROVAL_PENDING",
      invalidated: { ...current.invalidated, ...draft.invalidated },
    }));
  };

  const applyRevisionRequest = () => {
    const request = revisionRequest.trim();
    if (!request) return;
    setEdited((current) => `${current.trimEnd()}\n\n## 수정 요청\n- 요청: ${request}\n`);
    setRevisionRequest("");
  };

  const applySourceMapCorrectionRequest = () => {
    const request = sourceMapCorrectionRequest.trim();
    if (!request) return;
    setEdited((current) => `${current.trimEnd()}\n\n## 자료 연결 수정 요청\n- 요청: ${request}\n`);
    setSourceMapCorrectionRequest("");
  };

  const approve = () => {
    if (!plan) return;
    const result = createApprovedPlan({
      projectId: project.id,
      plan,
      markdown: edited,
      existingApprovals: project.approvalLog,
    });
    if (result.kind === "blocked") return;

    updateProject(project.id, { plan: result.plan });
    approveStage(project.id, "plan", "DESIGNING", result.artifact.hash, result.artifact);
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "design" },
    });
  };

  return (
    <StageShell>
      <StageScroll className="mx-auto max-w-6xl px-4 sm:px-8">
        <StageHeader num="03" sub="Plan" title="슬라이드 기획" />
        <InvalidatedBanner on={invalidated && !!plan} />
        {!plan ? (
          <EmptyAction
            label="조사 결과를 바탕으로 마크다운 덱 플랜 생성"
            busy={busy}
            onClick={generate}
          />
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <Tabs defaultValue="preview">
                <TabsList>
                  <TabsTrigger value="preview">
                    파싱 미리보기 ({parseResult.specs.length})
                  </TabsTrigger>
                  <TabsTrigger value="markdown">
                    <FileText className="h-3.5 w-3.5" /> 원문 기획 보기
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-4">
                  <PlanSlideSpecPreview specs={parseResult.specs} />
                </TabsContent>
                <TabsContent value="markdown" className="mt-4">
                  <Textarea
                    value={edited}
                    onChange={(event) => setEdited(event.target.value)}
                    rows={22}
                    className="font-mono text-xs leading-relaxed"
                  />
                </TabsContent>
              </Tabs>
            </div>
            <aside className="space-y-4">
              <PlanValidationSummary result={parseResult} />
              {sourceMapReview && (
                <SourceMapReviewPanel
                  review={sourceMapReview}
                  correctionText={sourceMapCorrectionRequest}
                  disabled={busy}
                  onCorrectionTextChange={setSourceMapCorrectionRequest}
                  onApplyCorrection={applySourceMapCorrectionRequest}
                />
              )}
              <PlanRevisionRequest
                value={revisionRequest}
                disabled={busy}
                onChange={setRevisionRequest}
                onApply={applyRevisionRequest}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!hasUnsavedChanges}
                onClick={saveEditedDraft}
                className="w-full"
              >
                <Save className="h-4 w-4" />
                편집본 저장
              </Button>
            </aside>
          </div>
        )}
      </StageScroll>
      <GateBar
        hint={
          plan
            ? parseResult.valid
              ? "슬라이드 구조를 확인했습니다. 승인하면 디자인 시스템을 만들 수 있습니다."
              : "검증 오류를 해결해야 디자인 시스템 생성으로 넘어갈 수 있습니다."
            : ""
        }
        regenerate={plan ? { label: "다시 생성", onClick: generate } : undefined}
        approve={
          plan
            ? {
                label: "기획을 승인하고 디자인 시스템 시작",
                onClick: approve,
                disabled: !parseResult.valid,
              }
            : undefined
        }
      />
    </StageShell>
  );
}
