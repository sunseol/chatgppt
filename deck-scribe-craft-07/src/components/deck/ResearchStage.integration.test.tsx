import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GateBar } from "@/components/deck/GateBar";
import {
  ClaimReviewList,
  DatasetReviewList,
  FactCheckReview,
  ReinforcementRequest,
} from "@/components/deck/ResearchPanels";
import { SourceReviewList } from "@/components/deck/ResearchSourcePreview";
import { SampleResearchModeNotice } from "@/components/deck/ResearchStage";
import { mockBrief, mockResearch } from "@/lib/mock-ai";

function fixtureMarkup() {
  const pack = mockResearch(mockBrief("투자자 피치덱", 8, "16:9"));
  return renderToStaticMarkup(
    <>
      <SourceReviewList sources={pack.sources} claims={pack.claims} />
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
    expect(markup.includes("조사 결과 확인")).toBe(true);
    expect(markup.includes("포함 이유")).toBe(true);
    expect(markup.includes("claim_004는 출처 없는 가설로 표시됨")).toBe(true);
    expect(markup.includes("보강 요청")).toBe(true);
  });

  test("hides approval before pack generation", () => {
    const markup = renderToStaticMarkup(<GateBar hint="" />);

    expect(markup.includes("조사 결과를 승인하고 슬라이드 기획 시작")).toBe(false);
  });

  test("uses a compact mobile action bar so content remains scroll-safe", () => {
    const markup = renderToStaticMarkup(
      <GateBar
        hint="생성이 끝났습니다. 결과를 확인한 뒤 검토로 이동하세요."
        approve={{ label: "검토로 이동", onClick: () => undefined }}
      />,
    );

    expect(markup.includes("py-2")).toBe(true);
    expect(markup.includes("sm:py-4")).toBe(true);
    expect(markup.includes("max-sm:hidden")).toBe(true);
  });

  test("labels development research output as sample data", () => {
    const markup = renderToStaticMarkup(<SampleResearchModeNotice />);

    expect(markup.includes("샘플 조사 모드")).toBe(true);
    expect(markup.includes("실제 웹 조사나 Codex 실행 결과가 아닙니다.")).toBe(true);
  });

  test("shows source map references", () => {
    const pack = mockResearch(mockBrief("투자자 피치덱", 8, "16:9"));
    const markup = renderToStaticMarkup(<ClaimReviewList claims={pack.claims} />);

    expect(markup.includes("claim_001")).toBe(true);
    expect(markup.includes("src_003")).toBe(true);
    expect(markup.includes("dataset_001")).toBe(true);
  });

  test("shows live source metadata, quote spans, confidence, and exclusion action", () => {
    const pack = mockResearch(mockBrief("투자자 피치덱", 8, "16:9"));
    const markup = renderToStaticMarkup(
      <SourceReviewList
        sources={[{ ...pack.sources[0], url: "https://example.gov/report" }]}
        claims={[pack.claims[0]]}
        liveEvidenceRefs={[
          {
            id: "ev_001",
            claimId: pack.claims[0].id,
            sourceId: pack.sources[0].id,
            sourceArtifactPath: "docs/live-source-capture-bundle/html_001/original.html",
            kind: "quote_span",
            quoteSpan: {
              start: 18,
              end: 22,
              text: "67%",
            },
          },
        ]}
        captureMetadata={[
          {
            sourceId: pack.sources[0].id,
            fetchedAt: "2026-06-18T08:19:04Z",
          },
        ]}
        onExcludeSource={() => undefined}
      />,
    );

    expect(markup.includes("https://example.gov/report")).toBe(true);
    expect(markup.includes("2026-06-18T08:19:04Z")).toBe(true);
    expect(markup.includes("quote 18-22")).toBe(true);
    expect(markup.includes("67%")).toBe(true);
    expect(markup.includes(pack.claims[0].confidence)).toBe(true);
    expect(markup.includes("출처 제외")).toBe(true);
  });

  test("shows persisted source capture metadata from research pack sources", () => {
    const pack = mockResearch(mockBrief("투자자 피치덱", 8, "16:9"));
    const markup = renderToStaticMarkup(
      <SourceReviewList
        sources={[
          {
            ...pack.sources[0],
            url: "https://example.gov/report",
            capture: {
              originalUrl: "https://example.gov/report",
              finalUrl: "https://example.gov/report?download=1",
              fetchedAt: 1_789_300_001,
              mimeType: "text/html",
              statusCode: 200,
              contentHash: "sha256:source-content",
              rawArchivePath: "docs/live-source-capture-bundle/html_001/original.html",
              textArchivePath: "docs/live-source-capture-bundle/html_001/extracted.txt",
              extractedTextHash: "sha256:source-text",
              version: 1,
            },
          },
        ]}
        claims={[pack.claims[0]]}
      />,
    );

    expect(markup.includes("fetched_at 1789300001")).toBe(true);
    expect(markup.includes("final_url https://example.gov/report?download=1")).toBe(true);
    expect(markup.includes("text/html · 200")).toBe(true);
    expect(markup.includes("sha256:source-content")).toBe(true);
  });
});
