import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GateBar } from "@/components/deck/GateBar";
import {
  BriefPreview,
  QuestionAnswerPanel,
  RevisionRequest,
} from "@/components/deck/InterviewPanels";
import { createBriefDraft, createQuestionPlan } from "@/components/deck/interview-stage-model";
import type { DeckProject, InterviewBrief, Stage } from "@/lib/deck-types";
import { isStepReachable } from "@/lib/workflow-engine";

function projectAt(stage: Stage): DeckProject {
  return {
    id: "p_interview_ui",
    name: "투자자 피치덱",
    initialPrompt:
      "초기 VC 대상으로 8장 투자 유치 피치덱을 만들어줘. 문제 정의, 시장, 솔루션 포함.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
    stage,
    createdAt: 1,
    updatedAt: 1,
    invalidated: {},
    approvalLog: [],
  };
}

function renderInterviewUi(brief: InterviewBrief | undefined): string {
  const project = projectAt(brief ? "INTERVIEW_APPROVAL_PENDING" : "INTERVIEWING");
  const plan = createQuestionPlan(project);
  return renderToStaticMarkup(
    <>
      <QuestionAnswerPanel plan={plan} answers={{}} onAnswers={() => undefined} />
      <BriefPreview brief={brief} plan={plan} />
      <RevisionRequest
        value={brief ? "투자자 관점으로 더 날카롭게" : ""}
        disabled={!brief}
        onChange={() => undefined}
        onApply={() => undefined}
      />
      <GateBar
        hint={
          brief
            ? "인터뷰 브리프를 검토하고 승인하면 조사 단계가 시작됩니다."
            : "질문에 답하고 인터뷰 초안을 생성해주세요."
        }
        regenerate={brief ? { label: "다시 생성", onClick: () => undefined } : undefined}
        approve={
          brief
            ? {
                label: "인터뷰 결과를 승인하고 조사 시작",
                onClick: () => undefined,
              }
            : undefined
        }
      />
    </>,
  );
}

describe("interview stage UI integration", () => {
  test("shows question and revision surfaces without exposing approval before a brief exists", () => {
    const markup = renderInterviewUi(undefined);

    expect(markup.includes("인터뷰 질문")).toBe(true);
    expect(markup.includes("브리프 미리보기")).toBe(true);
    expect(markup.includes("수정 요청")).toBe(true);
    expect(markup.includes('disabled=""')).toBe(true);
    expect(markup.includes("인터뷰 결과를 승인하고 조사 시작")).toBe(false);
  });

  test("shows the approval CTA only after a brief draft exists", () => {
    const project = projectAt("INTERVIEWING");
    const plan = createQuestionPlan(project);
    const brief = createBriefDraft(project, plan, {
      audience: "초기 VC",
      desiredOutcome: "시드 투자 검토 미팅 확보",
      goal: "투자 유치",
    });

    const markup = renderInterviewUi(brief);

    expect(markup.includes("인터뷰 결과를 승인하고 조사 시작")).toBe(true);
    expect(markup.includes("수정 요청 반영")).toBe(true);
    expect(markup.includes('disabled=""')).toBe(false);
  });

  test("keeps research unreachable until the interview approval stage advances", () => {
    expect(isStepReachable(projectAt("INTERVIEW_APPROVAL_PENDING"), "research")).toBe(false);
    expect(isStepReachable(projectAt("RESEARCHING"), "research")).toBe(true);
  });
});
