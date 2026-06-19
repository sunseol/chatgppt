import { describe, expect, test } from "bun:test";
import type { InterviewBrief } from "./deck-types";
import { planInterviewQuestions } from "./interview-questions";
import { evaluateLiveInterviewCutover } from "./live-interview-cutover";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live interview cutover prompt versions", () => {
  test("accepts the desktop interview question prompt version", () => {
    const plan = planInterviewQuestions({
      initialPrompt: "한국어 제품 소개 덱을 5장으로 만들어줘.",
      slideCount: 5,
      aspectRatio: "16:9",
      language: "ko",
    });

    const result = evaluateLiveInterviewCutover({
      questionPlan: {
        artifact: plan,
        provenance: liveCodexProvenance(
          "interview_questions_live_desktop",
          "turn_q",
          ["project_001"],
          "interview_questions_desktop@v1",
        ),
      },
      answers: completeAnswers(),
      brief: {
        artifact: completeBrief(),
        provenance: liveCodexProvenance(
          "interview_brief_live_desktop",
          "turn_b",
          ["interview_questions_live_desktop", "interview_questions_live_desktop_answers"],
          "interview_brief@v1",
        ),
      },
    });

    expect(result.kind).toBe("ready");
  });

  test("blocks Codex question artifacts generated with a non-interview prompt", () => {
    const plan = planInterviewQuestions({
      initialPrompt: "한국어 제품 소개 덱을 5장으로 만들어줘.",
      slideCount: 5,
      aspectRatio: "16:9",
      language: "ko",
    });

    const result = evaluateLiveInterviewCutover({
      questionPlan: {
        artifact: plan,
        provenance: liveCodexProvenance(
          "interview_questions_live_wrong_prompt",
          "turn_q",
          ["project_001"],
          "deck_plan@v1",
        ),
      },
      answers: completeAnswers(),
      brief: {
        artifact: completeBrief(),
        provenance: liveCodexProvenance(
          "interview_brief_live_1",
          "turn_b",
          [
            "interview_questions_live_wrong_prompt",
            "interview_questions_live_wrong_prompt_answers",
          ],
          "interview_brief@v1",
        ),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["interview_prompt_version_mismatch"]);
    expect(result.issues[0]?.stage).toBe("questions");
  });

  test("blocks Codex brief artifacts generated with a non-brief prompt", () => {
    const plan = planInterviewQuestions({
      initialPrompt: "한국어 제품 소개 덱을 5장으로 만들어줘.",
      slideCount: 5,
      aspectRatio: "16:9",
      language: "ko",
    });

    const result = evaluateLiveInterviewCutover({
      questionPlan: {
        artifact: plan,
        provenance: liveCodexProvenance(
          "interview_questions_live_1",
          "turn_q",
          ["project_001"],
          "interview_questions@v1",
        ),
      },
      answers: completeAnswers(),
      brief: {
        artifact: completeBrief(),
        provenance: liveCodexProvenance(
          "interview_brief_live_wrong_prompt",
          "turn_b",
          ["interview_questions_live_1", "interview_questions_live_1_answers"],
          "deck_plan@v1",
        ),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["interview_prompt_version_mismatch"]);
    expect(result.issues[0]?.stage).toBe("brief");
  });
});

function liveCodexProvenance(
  artifactId: string,
  turnId: string,
  inputArtifactIds: readonly string[],
  promptVersion: string,
) {
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex-cli 0.141.0",
    promptVersion,
    durationMs: 2400,
    inputArtifactIds,
    fixture: false,
    threadId: "thread_interview_1",
    turnId,
  });
}

function completeAnswers() {
  return {
    goal: "제품 소개",
    audience: "도입 검토자",
    coreMessage: "제품 가치를 명확히 전달한다.",
    desiredOutcome: "도입 검토",
    mustInclude: "주요 기능과 도입 효과",
    mustAvoid: "출처 없는 주장",
    successCriteria: "이해 가능한 메시지",
    tone: "명료한",
  };
}

function completeBrief(): InterviewBrief {
  return {
    id: "brief_live_1",
    goal: "제품 소개",
    audience: "도입 검토자",
    desiredOutcome: "도입 검토",
    slideCount: 5,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["명료한"],
    mustInclude: ["주요 기능과 도입 효과"],
    mustAvoid: ["출처 없는 주장"],
    successCriteria: ["이해 가능한 메시지"],
    openQuestions: [],
  };
}
