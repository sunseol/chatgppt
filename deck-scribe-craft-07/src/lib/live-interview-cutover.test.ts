import { describe, expect, test } from "bun:test";
import type { InterviewBrief } from "./deck-types";
import { planInterviewQuestions } from "./interview-questions";
import {
  createLiveInterviewProviderFailureRecovery,
  evaluateLiveInterviewCutover,
} from "./live-interview-cutover";
import {
  createProviderArtifactProvenance,
  type ProviderArtifactProvenance,
} from "./provider-provenance";

describe("live interview cutover", () => {
  test("accepts separate live Codex question and brief turns with provenance", () => {
    const plan = planInterviewQuestions({
      initialPrompt:
        "임원 대상 내부 보고용. 채널별 성과, 핵심 캠페인, 학습, 다음 분기 계획을 데이터 기반으로 절제된 톤으로 정리해서 승인받고 싶어.",
      slideCount: 10,
      aspectRatio: "16:9",
      language: "ko",
    });

    const result = evaluateLiveInterviewCutover({
      questionPlan: {
        artifact: plan,
        provenance: liveCodexProvenance("interview_questions_live_1", "turn_questions"),
      },
      answers: {
        coreMessage: "채널별 학습을 다음 분기 예산 의사결정으로 연결한다.",
        mustAvoid: "검증되지 않은 성과 과장",
      },
      brief: {
        artifact: completeBrief(),
        provenance: liveCodexProvenance("interview_brief_live_1", "turn_brief", [
          "interview_questions_live_1",
        ]),
      },
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.questionArtifactId).toBe("interview_questions_live_1");
    expect(result.briefArtifactId).toBe("interview_brief_live_1");
    expect(result.provenanceLineage.map((item) => item.turnId)).toEqual([
      "turn_questions",
      "turn_brief",
    ]);
  });

  test("requires a follow-up turn instead of accepting a brief when required answers are missing", () => {
    const plan = planInterviewQuestions({
      initialPrompt: "AI 윤리 강의자료를 6장으로 만들어줘.",
      slideCount: 6,
      aspectRatio: "16:9",
      language: "ko",
    });

    const result = evaluateLiveInterviewCutover({
      questionPlan: {
        artifact: plan,
        provenance: liveCodexProvenance("interview_questions_live_2", "turn_questions_2"),
      },
      answers: {
        audience: "중학생",
      },
    });

    expect(result.kind).toBe("follow_up_required");
    if (result.kind !== "follow_up_required") return;
    expect(result.requiredFields.includes("coreMessage")).toBe(true);
    expect(result.nextTurn.inputArtifactIds).toEqual(["interview_questions_live_2"]);
    expect(result.nextTurn.promptVersion).toBe("interview_follow_up@v1");
  });

  test("blocks mock or fixture provenance and exposes non-fixture recovery actions", () => {
    const plan = planInterviewQuestions({
      initialPrompt:
        "초기 VC 대상으로 8장 투자 유치 피치덱을 만들어줘. 문제 정의, 시장, 솔루션, 비즈니스 모델을 포함.",
      slideCount: 8,
      aspectRatio: "16:9",
      language: "ko",
    });

    const result = evaluateLiveInterviewCutover({
      questionPlan: {
        artifact: plan,
        provenance: createProviderArtifactProvenance({
          artifactId: "interview_questions_mock",
          executionMode: "production",
          providerKind: "mock",
          authMode: "none",
          modelOrRuntime: "mock-provider",
          promptVersion: "interview_questions@v1",
          durationMs: 1,
          inputArtifactIds: [],
          fixture: true,
        }),
      },
      answers: {
        coreMessage: "검증된 시장 기회와 실행력을 보여준다.",
        desiredOutcome: "후속 미팅",
        mustAvoid: "출처 없는 시장 규모",
        successCriteria: "투자자 follow-up",
        tone: "전문적",
      },
      brief: {
        artifact: completeBrief(),
        provenance: liveCodexProvenance("interview_brief_live_2", "turn_brief_2", [
          "interview_questions_mock",
        ]),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    const issueCodes = result.issues.map((issue) => issue.code);
    expect(issueCodes.includes("mock_lineage_contamination")).toBe(true);
    expect(issueCodes.includes("fixture_lineage_contamination")).toBe(true);
    expect(result.recovery.fixtureFallbackAllowed).toBe(false);
    expect(result.recovery.actions).toEqual(["retry_live_turn", "manual_input"]);
  });

  test("provider failure recovery never offers a fixture fallback", () => {
    const recovery = createLiveInterviewProviderFailureRecovery({
      stage: "brief",
      message: "Codex App Server disconnected before completion.",
    });

    expect(recovery.stage).toBe("brief");
    expect(recovery.fixtureFallbackAllowed).toBe(false);
    expect(recovery.actions).toEqual(["retry_live_turn", "manual_input"]);
  });
});

function liveCodexProvenance(
  artifactId: string,
  turnId: string,
  inputArtifactIds: readonly string[] = [],
): ProviderArtifactProvenance {
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex-cli 0.141.0",
    promptVersion: artifactId.includes("brief") ? "interview_brief@v1" : "interview_questions@v1",
    durationMs: 2400,
    inputArtifactIds,
    fixture: false,
    threadId: "thread_interview_1",
    turnId,
  });
}

function completeBrief(): InterviewBrief {
  return {
    id: "brief_live_1",
    goal: "내부 보고용 덱",
    audience: "임원",
    desiredOutcome: "승인 또는 의사결정",
    slideCount: 10,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["데이터 기반", "절제된"],
    mustInclude: ["채널별 성과", "다음 분기 계획"],
    mustAvoid: ["검증되지 않은 성과 과장"],
    successCriteria: ["승인 가능한 명확성"],
    openQuestions: [],
  };
}
