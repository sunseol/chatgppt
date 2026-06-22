import { describe, expect, test } from "bun:test";
import type { InterviewBrief } from "./deck-types";
import { planInterviewQuestions } from "./interview-questions";
import { evaluateLiveInterviewCutover } from "./live-interview-cutover";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live interview question input lineage", () => {
  test("blocks question turns that omit the project input artifact", () => {
    const plan = planInterviewQuestions({
      initialPrompt: "한국어 제품 소개 덱을 5장으로 만들어줘.",
      slideCount: 5,
      aspectRatio: "16:9",
      language: "ko",
    });

    const result = evaluateLiveInterviewCutover({
      questionInputArtifactId: "project_live_interview",
      questionPlan: {
        artifact: plan,
        provenance: liveCodexProvenance("interview_questions_live_1", "turn_questions", []),
      },
      answers: completeAnswers(),
      brief: {
        artifact: completeBrief(),
        provenance: liveCodexProvenance("interview_brief_live_1", "turn_brief", [
          "interview_questions_live_1",
          "interview_questions_live_1_answers",
        ]),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(
      result.issues.map((issue) => issue.code).includes("question_missing_project_input"),
    ).toBe(true);
  });
});

function liveCodexProvenance(
  artifactId: string,
  turnId: string,
  inputArtifactIds: readonly string[],
) {
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
