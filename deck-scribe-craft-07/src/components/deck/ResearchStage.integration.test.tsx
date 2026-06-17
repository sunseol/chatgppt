import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GateBar } from "@/components/deck/GateBar";
import {
  ClaimReviewList,
  DatasetReviewList,
  FactCheckReview,
  ReinforcementRequest,
  SourceReviewList,
} from "@/components/deck/ResearchPanels";
import { mockBrief, mockResearch } from "@/lib/mock-ai";

function fixtureMarkup() {
  const pack = mockResearch(mockBrief("투자자 피치덱", 8, "16:9"));
  return renderToStaticMarkup(
    <>
      <SourceReviewList sources={pack.sources} />
      <ClaimReviewList claims={pack.claims} />
      <DatasetReviewList datasets={pack.datasets} charts={pack.charts} />
      <FactCheckReview report={pack.factCheckReport} />
      <ReinforcementRequest
        value="정부 원자료로 보강"
        disabled={false}
        onChange={() => undefined}
        onApply={() => undefined}
      />
      <GateBar
        hint="출처, 주장, 데이터셋, 불확실 항목을 검토한 뒤 승인하면 슬라이드 기획이 시작됩니다."
        approve={{
          label: "조사 결과를 승인하고 슬라이드 기획 시작",
          onClick: () => undefined,
        }}
      />
    </>,
  );
}

describe("research review UI", () => {
  test("renders sources, claims, datasets, fact-check and uncertainty", () => {
    const markup = fixtureMarkup();

    expect(markup.includes("등급 A")).toBe(true);
    expect(markup.includes("claim_004")).toBe(true);
    expect(markup.includes("dataset_001")).toBe(true);
    expect(markup.includes("Fact Check")).toBe(true);
    expect(markup.includes("claim_004는 출처 없는 가설로 표시됨")).toBe(true);
    expect(markup.includes("보강 요청")).toBe(true);
  });

  test("hides approval before pack generation", () => {
    const markup = renderToStaticMarkup(<GateBar hint="" />);

    expect(markup.includes("조사 결과를 승인하고 슬라이드 기획 시작")).toBe(false);
  });

  test("shows source map references", () => {
    const pack = mockResearch(mockBrief("투자자 피치덱", 8, "16:9"));
    const markup = renderToStaticMarkup(<ClaimReviewList claims={pack.claims} />);

    expect(markup.includes("claim_001")).toBe(true);
    expect(markup.includes("src_003")).toBe(true);
    expect(markup.includes("dataset_001")).toBe(true);
  });
});
