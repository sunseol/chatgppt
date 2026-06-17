import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GateBar } from "@/components/deck/GateBar";
import {
  PlanRevisionRequest,
  PlanSlideSpecPreview,
  PlanValidationSummary,
} from "@/components/deck/PlanPanels";
import { parseDeckPlanMarkdown } from "@/lib/slide-spec-parser";

describe("plan editor UI", () => {
  test("shows editor preview, validation, revision request, and disabled approval", () => {
    const result = parseDeckPlanMarkdown(invalidMarkdown());
    const markup = renderToStaticMarkup(
      <>
        <PlanValidationSummary result={result} />
        <PlanSlideSpecPreview specs={result.specs} />
        <PlanRevisionRequest
          value="시장 슬라이드 근거를 더 보수적으로"
          disabled={false}
          onChange={() => undefined}
          onApply={() => undefined}
        />
        <GateBar
          hint="검증 오류를 해결해야 승인할 수 있습니다."
          approve={{
            label: "기획을 승인하고 디자인 시스템 시작",
            onClick: () => undefined,
            disabled: !result.valid,
          }}
        />
      </>,
    );

    expect(markup.includes("승인 차단")).toBe(true);
    expect(markup.includes("Slide 1 is missing body points.")).toBe(true);
    expect(markup.includes("파싱된 슬라이드")).toBe(true);
    expect(markup.includes("수정 요청")).toBe(true);
    expect(markup.includes("disabled")).toBe(true);
  });
});

function invalidMarkdown(): string {
  return [
    "## Slide 1. Problem",
    "- 제목: 문제 정의",
    "- 역할: 문제 제시",
    "- 핵심 메시지: 조사 없는 생성은 신뢰를 떨어뜨린다.",
    "- 시각화 방향: 2x2 카드",
    "- 사용할 근거: claim_002",
    "- 편집 가능 요소: 카드 제목, 설명",
    "- 데이터/출처 제약: claim_002",
  ].join("\n");
}
