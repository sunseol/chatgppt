import { describe, expect, test } from "bun:test";
import type { InterviewBrief } from "./deck-types";
import { planInterviewQuestions } from "./interview-questions";
import { evaluateLiveInterviewCutover } from "./live-interview-cutover";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("live interview artifact identity", () => {
  test("blocks a brief artifact that reuses the question artifact id", () => {
    const questionArtifactId = "interview_questions_live_1";

    const result = evaluateLiveInterviewCutover({
      questionInputArtifactId: "project_live_interview",
      questionPlan: {
        artifact: planInterviewQuestions({
          initialPrompt: "한국어 제품 소개 덱을 5장으로 만들어줘.",
          slideCount: 5,
          aspectRatio: "16:9",
          language: "ko",
        }),
        provenance: liveCodexProvenance(questionArtifactId, "turn_questions", [
          "project_live_interview",
        ]),
      },
      answers: {
        goal: "제품 소개",
        audience: "도입 검토자",
        coreMessage: "제품 가치를 명확히 전달한다.",
        desiredOutcome: "도입 검토",
        mustInclude: "주요 기능과 도입 효과",
        mustAvoid: "출처 없는 주장",
        successCriteria: "이해 가능한 메시지",
        tone: "명료한",
      },
      brief: {
        artifact: completeBrief(),
        provenance: liveCodexProvenance(questionArtifactId, "turn_brief", [
          questionArtifactId,
          `${questionArtifactId}_answers`,
        ]),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(
      result.issues.map((issue) => issue.code).includes("brief_reused_question_artifact"),
    ).toBe(true);
  });

  test("blocks a brief artifact that pads the reused question artifact and turn ids", () => {
    const questionArtifactId = "interview_questions_live_1";
    const questionTurnId = "turn_questions";

    const result = evaluateLiveInterviewCutover({
      questionInputArtifactId: "project_live_interview",
      questionPlan: {
        artifact: planInterviewQuestions({
          initialPrompt: "한국어 제품 소개 덱을 5장으로 만들어줘.",
          slideCount: 5,
          aspectRatio: "16:9",
          language: "ko",
        }),
        provenance: liveCodexProvenance(questionArtifactId, questionTurnId, [
          "project_live_interview",
        ]),
      },
      answers: {
        goal: "제품 소개",
        audience: "도입 검토자",
        coreMessage: "제품 가치를 명확히 전달한다.",
        desiredOutcome: "도입 검토",
        mustInclude: "주요 기능과 도입 효과",
        mustAvoid: "출처 없는 주장",
        successCriteria: "이해 가능한 메시지",
        tone: "명료한",
      },
      brief: {
        artifact: completeBrief(),
        provenance: liveCodexProvenance(
          ` ${questionArtifactId} `,
          ` ${questionTurnId} `,
          [questionArtifactId, `${questionArtifactId}_answers`],
          "interview_brief@v1",
        ),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    const issueCodes = result.issues.map((issue) => issue.code);
    expect(issueCodes.includes("brief_reused_question_turn")).toBe(true);
    expect(issueCodes.includes("brief_reused_question_artifact")).toBe(true);
  });

  test("blocks otherwise distinct brief artifacts with non-canonical persisted identities", () => {
    const questionArtifactId = "interview_questions_live_1";

    const result = evaluateLiveInterviewCutover({
      questionInputArtifactId: "project_live_interview",
      questionPlan: {
        artifact: planInterviewQuestions({
          initialPrompt: "한국어 제품 소개 덱을 5장으로 만들어줘.",
          slideCount: 5,
          aspectRatio: "16:9",
          language: "ko",
        }),
        provenance: liveCodexProvenance(questionArtifactId, "turn_questions", [
          "project_live_interview",
        ]),
      },
      answers: {
        goal: "제품 소개",
        audience: "도입 검토자",
        coreMessage: "제품 가치를 명확히 전달한다.",
        desiredOutcome: "도입 검토",
        mustInclude: "주요 기능과 도입 효과",
        mustAvoid: "출처 없는 주장",
        successCriteria: "이해 가능한 메시지",
        tone: "명료한",
      },
      brief: {
        artifact: completeBrief(),
        provenance: liveCodexProvenance(
          " interview_brief_live_1 ",
          " turn_brief ",
          [questionArtifactId, `${questionArtifactId}_answers`],
          "interview_brief@v1",
        ),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(
      result.issues.map((issue) => issue.code).includes("noncanonical_interview_identity"),
    ).toBe(true);
  });

  test("blocks a brief answer bundle that reuses the question artifact id", () => {
    const questionArtifactId = "interview_questions_live_1";

    const result = evaluateLiveInterviewCutover({
      questionInputArtifactId: "project_live_interview",
      questionPlan: {
        artifact: planInterviewQuestions({
          initialPrompt: "한국어 제품 소개 덱을 5장으로 만들어줘.",
          slideCount: 5,
          aspectRatio: "16:9",
          language: "ko",
        }),
        provenance: liveCodexProvenance(questionArtifactId, "turn_questions", [
          "project_live_interview",
        ]),
      },
      answers: {
        goal: "제품 소개",
        audience: "도입 검토자",
        coreMessage: "제품 가치를 명확히 전달한다.",
        desiredOutcome: "도입 검토",
        mustInclude: "주요 기능과 도입 효과",
        mustAvoid: "출처 없는 주장",
        successCriteria: "이해 가능한 메시지",
        tone: "명료한",
      },
      answerArtifactId: questionArtifactId,
      brief: {
        artifact: completeBrief(),
        provenance: liveCodexProvenance("interview_brief_live_1", "turn_brief", [
          questionArtifactId,
        ]),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["brief_reused_question_answer"]);
  });
});

function liveCodexProvenance(
  artifactId: string,
  turnId: string,
  inputArtifactIds: readonly string[],
  promptVersion?: string,
) {
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex-cli 0.141.0",
    promptVersion:
      promptVersion ?? (turnId === "turn_brief" ? "interview_brief@v1" : "interview_questions@v1"),
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
