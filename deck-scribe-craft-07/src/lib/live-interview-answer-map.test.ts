import { describe, expect, test } from "bun:test";
import { createLiveInterviewAnswerMap } from "./live-interview-answer-map";
import type { DeckProject, InterviewBrief } from "./deck-types";

describe("live interview answer map", () => {
  test("returns no answers when the project has no draft brief", () => {
    // Given
    const project = projectFixture();

    // When
    const answers = createLiveInterviewAnswerMap(project);

    // Then
    expect(answers).toEqual({});
  });

  test("maps the project draft brief into live interview answers", () => {
    // Given
    const project = projectFixture({ brief: briefFixture() });

    // When
    const answers = createLiveInterviewAnswerMap(project);

    // Then
    expect(answers).toEqual({
      goal: "성과 리뷰",
      audience: "임원",
      desiredOutcome: "예산 승인",
      coreMessage: "성과 학습을 다음 분기 예산 승인으로 연결한다.",
      slideCount: "5",
      aspectRatio: "16:9",
      language: "ko",
      tone: "절제된, 데이터 기반",
      mustInclude: "채널별 성과, 다음 분기 실행 계획",
      mustAvoid: "출처 없는 그래프",
      successCriteria: "예산 승인 판단 가능",
    });
  });
});

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_live_interview_answers",
    name: "Live Interview Answers",
    initialPrompt: "성과 학습을 다음 분기 예산 승인으로 연결한다.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "INTERVIEWING",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    invalidated: {},
    approvalLog: [],
    ...patch,
  };
}

function briefFixture(): InterviewBrief {
  return {
    id: "brief_live_answers",
    goal: "성과 리뷰",
    audience: "임원",
    desiredOutcome: "예산 승인",
    slideCount: 5,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["절제된", "데이터 기반"],
    mustInclude: ["채널별 성과", "다음 분기 실행 계획"],
    mustAvoid: ["출처 없는 그래프"],
    successCriteria: ["예산 승인 판단 가능"],
    openQuestions: [],
  };
}
