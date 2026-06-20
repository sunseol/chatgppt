import { describe, expect, test } from "bun:test";
import { evaluateLiveInterviewCutover } from "./live-interview-cutover";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live interview follow-up questions", () => {
  test("blocks follow-up turns whose required question text is blank", () => {
    const result = evaluateLiveInterviewCutover({
      questionInputArtifactId: "project_live_interview",
      questionPlan: {
        artifact: {
          draft: {
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
          },
          questions: [{ field: "coreMessage", question: "   " }],
          openQuestions: [],
        },
        provenance: liveCodexProvenance(),
      },
      answers: {},
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_follow_up_question"]);
  });
});

function liveCodexProvenance() {
  return createProviderArtifactProvenance({
    artifactId: "interview_questions_live_1",
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex-cli 0.141.0",
    promptVersion: "interview_questions@v1",
    durationMs: 2400,
    inputArtifactIds: ["project_live_interview"],
    fixture: false,
    threadId: "thread_interview_1",
    turnId: "turn_questions",
  });
}
