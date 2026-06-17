import { describe, expect, test } from "bun:test";
import { planInterviewQuestions } from "./interview-questions";

describe("interview question planner", () => {
  test("extracts explicit VC pitch deck instructions", () => {
    const plan = planInterviewQuestions({
      initialPrompt:
        "초기 VC 대상으로 8장 투자 유치 피치덱을 만들어줘. 문제 정의, 시장, 솔루션, 비즈니스 모델을 포함.",
      slideCount: 8,
      aspectRatio: "16:9",
      language: "ko",
    });

    expect(plan.draft.goal).toBe("투자 유치용 피치덱");
    expect(plan.draft.audience).toBe("초기 VC 및 투자자");
    expect(plan.draft.slideCount).toBe(8);
    expect(plan.draft.mustInclude.includes("문제 정의")).toBe(true);
    expect(plan.draft.mustInclude.includes("비즈니스 모델")).toBe(true);
    expect(plan.questions.map((question) => question.field).includes("slideCount")).toBe(false);
  });

  test("extracts executive report audience, outcome, tone, and sections", () => {
    const plan = planInterviewQuestions({
      initialPrompt:
        "임원 대상 내부 보고용. 채널별 성과, 핵심 캠페인, 학습, 다음 분기 계획을 데이터 기반으로 절제된 톤으로 정리해서 승인받고 싶어.",
      slideCount: 10,
      aspectRatio: "16:9",
      language: "ko",
    });

    expect(plan.draft.audience).toBe("임원");
    expect(plan.draft.desiredOutcome).toBe("승인 또는 의사결정");
    expect(plan.draft.tone.includes("데이터 기반")).toBe(true);
    expect(plan.draft.tone.includes("절제된")).toBe(true);
    expect(plan.draft.mustInclude.includes("채널별 성과")).toBe(true);
  });

  test("asks follow-up questions for missing required fields", () => {
    const plan = planInterviewQuestions({
      initialPrompt: "AI 윤리 강의자료를 6장으로 만들어줘.",
      slideCount: 6,
      aspectRatio: "16:9",
      language: "ko",
    });
    const fields = plan.questions.map((question) => question.field);

    expect(fields.includes("audience")).toBe(true);
    expect(fields.includes("desiredOutcome")).toBe(true);
    expect(fields.includes("coreMessage")).toBe(true);
    expect(fields.includes("successCriteria")).toBe(true);
  });

  test("records language conflicts as open questions", () => {
    const plan = planInterviewQuestions({
      initialPrompt: "한국어로 작성해줘. 단, 모든 본문은 English only로 만들어줘.",
      slideCount: 7,
      aspectRatio: "16:9",
      language: "ko",
    });

    expect(plan.draft.language).toBe("mixed");
    expect(plan.openQuestions.includes("한국어와 English only 지시가 충돌합니다.")).toBe(true);
  });

  test("preserves prohibited content and asks for remaining success criteria", () => {
    const plan = planInterviewQuestions({
      initialPrompt:
        "10장 제안서. 고객사 로고와 사례를 포함하고, 과장된 수치와 출처 없는 그래프는 금지.",
      slideCount: 10,
      aspectRatio: "16:9",
      language: "ko",
    });
    const fields = plan.questions.map((question) => question.field);

    expect(plan.draft.mustInclude.includes("고객사 로고")).toBe(true);
    expect(plan.draft.mustInclude.includes("사례")).toBe(true);
    expect(plan.draft.mustAvoid.includes("과장된 수치")).toBe(true);
    expect(plan.draft.mustAvoid.includes("출처 없는 그래프")).toBe(true);
    expect(fields.includes("successCriteria")).toBe(true);
  });
});
