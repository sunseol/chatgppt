import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { GateBar } from "@/components/deck/GateBar";
import {
  BriefEditor,
  BriefPreview,
  QuestionAnswerPanel,
  RevisionRequest,
} from "@/components/deck/InterviewPanels";
import { EmptyAction, InvalidatedBanner, StageHeader } from "@/components/deck/stage-shared";
import { createBriefDraft, createQuestionPlan } from "@/components/deck/interview-stage-model";
import type { InterviewAnswerMap } from "@/components/deck/interview-stage-model";
import { approveStage, invalidateDownstream, updateProject } from "@/lib/deck-store";
import type { DeckProject, InterviewBrief } from "@/lib/deck-types";
import { hash } from "@/lib/mock-ai";

export function InterviewStage({ project }: { readonly project: DeckProject }) {
  const navigate = useNavigate();
  const questionPlan = useMemo(() => createQuestionPlan(project), [project]);
  const [answers, setAnswers] = useState<InterviewAnswerMap>({});
  const [brief, setBrief] = useState<InterviewBrief | undefined>(project.brief);
  const [busy, setBusy] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState("");
  const invalidated = !!project.invalidated.interview;

  useEffect(() => {
    setBrief(project.brief);
  }, [project.brief]);

  const generate = async () => {
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const next = createBriefDraft(project, questionPlan, answers);
    updateProject(project.id, { brief: next, stage: "INTERVIEW_APPROVAL_PENDING" });
    setBrief(next);
    invalidateDownstream(project.id, "interview");
    setBusy(false);
  };

  const applyRevisionRequest = () => {
    if (!brief || !revisionRequest.trim()) return;
    const next = {
      ...brief,
      openQuestions: [...brief.openQuestions, `수정 요청: ${revisionRequest.trim()}`],
    };
    setBrief(next);
    updateProject(project.id, { brief: next, stage: "INTERVIEW_APPROVAL_PENDING" });
    setRevisionRequest("");
  };

  const approve = () => {
    if (!brief) return;
    const approvedHash = hash(JSON.stringify(brief));
    updateProject(project.id, { brief: { ...brief, approvedHash } });
    approveStage(project.id, "interview", "RESEARCHING", approvedHash);
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "research" },
    });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        <StageHeader num="01" sub="Interview · Intent Discovery" title="사용자 의도 인터뷰" />
        <InvalidatedBanner on={invalidated && !!brief} />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <QuestionAnswerPanel plan={questionPlan} answers={answers} onAnswers={setAnswers} />
            {!brief ? (
              <EmptyAction
                label="질문 답변을 바탕으로 인터뷰 브리프 초안 생성"
                busy={busy}
                onClick={generate}
              />
            ) : (
              <BriefEditor brief={brief} onBrief={setBrief} />
            )}
          </section>
          <aside className="space-y-4">
            <BriefPreview brief={brief} plan={questionPlan} />
            <RevisionRequest
              value={revisionRequest}
              disabled={!brief}
              onChange={setRevisionRequest}
              onApply={applyRevisionRequest}
            />
          </aside>
        </div>
      </div>
      <GateBar
        hint={
          brief
            ? "인터뷰 브리프를 검토하고 승인하면 조사 단계가 시작됩니다."
            : "질문에 답하고 인터뷰 초안을 생성해주세요."
        }
        regenerate={brief ? { label: "다시 생성", onClick: generate } : undefined}
        approve={
          brief
            ? {
                label: "인터뷰 결과를 승인하고 조사 시작",
                onClick: () => {
                  updateProject(project.id, { brief });
                  approve();
                },
              }
            : undefined
        }
      />
    </div>
  );
}
