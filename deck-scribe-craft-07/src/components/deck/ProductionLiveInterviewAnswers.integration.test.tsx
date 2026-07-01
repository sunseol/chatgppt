import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductionLiveInterviewAnswers } from "./ProductionLiveInterviewAnswers";

describe("production live interview answers", () => {
  test("shows a disabled brief generation CTA while required answers are missing", () => {
    // Given
    const questions = ["이 덱의 목적은 무엇인가요?"];

    // When
    const markup = renderToStaticMarkup(
      <ProductionLiveInterviewAnswers
        questions={questions}
        requiredFields={["goal"]}
        answers={{}}
        onAnswers={() => undefined}
        onSubmitAnswers={() => undefined}
      />,
    );

    // Then
    expect(markup.includes("답변 제출하고 브리프 생성")).toBe(true);
    expect(markup.includes("필수 답변 1개 남음")).toBe(true);
    expect(answerSubmitButtonMarkup(markup).includes('disabled=""')).toBe(true);
  });

  test("enables the brief generation CTA when required answers are complete", () => {
    // Given
    const questions = ["이 덱의 목적은 무엇인가요?"];

    // When
    const markup = renderToStaticMarkup(
      <ProductionLiveInterviewAnswers
        questions={questions}
        requiredFields={["goal"]}
        answers={{ goal: "임원에게 2026년 투자 우선순위를 설득합니다." }}
        onAnswers={() => undefined}
        onSubmitAnswers={() => undefined}
      />,
    );

    // Then
    expect(markup.includes("모든 필수 답변 입력 완료")).toBe(true);
    expect(answerSubmitButtonMarkup(markup).includes('disabled=""')).toBe(false);
  });
});

function answerSubmitButtonMarkup(markup: string): string {
  const labelIndex = markup.indexOf("답변 제출하고 브리프 생성");
  const buttonStart = markup.lastIndexOf("<button", labelIndex);
  const buttonEnd = markup.indexOf("</button>", labelIndex);
  return markup.slice(buttonStart, buttonEnd);
}
