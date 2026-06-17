import { describe, expect, test } from "bun:test";
import { parseDeckPlanMarkdown, SlideSpecSchema } from "./slide-spec-parser";

describe("slide spec parser", () => {
  test("parses markdown slides into structured specs", () => {
    const result = parseDeckPlanMarkdown(deckPlanMarkdown());

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.specs).toEqual([
      {
        number: 1,
        title: "검증 가능한 AI 슬라이드 제작 시스템",
        role: "덱의 주제와 신뢰 기반 포지셔닝 제시",
        coreMessage: "승인·조사·편집성을 갖춘 제작 시스템",
        bodyPoints: ["승인 게이트", "출처 기반 조사", "편집 가능한 산출물"],
        visualType: "미니멀한 제품 히어로 이미지 + 강한 타이포그래피",
        visualComposition: "미니멀한 제품 히어로 이미지 + 강한 타이포그래피",
        evidence: [],
        editableElements: ["제목", "부제", "날짜", "로고"],
        dataSourceConstraints: ["구조 슬라이드라 사실 주장 없음"],
      },
      {
        number: 2,
        title: "시장 변화가 만드는 기회",
        role: "시장 근거 제시",
        coreMessage: "국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
        bodyPoints: ["2025년 국내 기업 도입률", "초기 도입에서 반복 제작 수요 발생"],
        visualType: "막대 차트 + 인사이트 카드",
        visualComposition: "막대 차트 + 인사이트 카드",
        evidence: ["claim_001", "src_001", "dataset_001"],
        editableElements: ["수치", "인사이트", "캡션"],
        dataSourceConstraints: ["claim_001", "src_001", "dataset_001"],
      },
    ]);
  });

  test("reports approval-blocking errors for missing required fields", () => {
    const markdown = [
      "## Slide 1. Problem",
      "- 제목: 문제 정의",
      "- 역할: 문제 제시",
      "- 핵심 메시지: 조사 없는 생성은 신뢰를 떨어뜨린다.",
      "- 시각화 방향: 2x2 카드",
      "- 사용할 근거: claim_002",
      "- 편집 가능 요소: 카드 제목, 설명",
      "- 데이터/출처 제약: claim_002",
    ].join("\n");

    const result = parseDeckPlanMarkdown(markdown);

    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        (issue) =>
          issue.code === "missing_field" &&
          issue.severity === "fatal" &&
          issue.slideNumber === 1 &&
          issue.field === "bodyPoints" &&
          issue.message === "Slide 1 is missing body points.",
      ),
    ).toBe(true);
  });

  test("reflects user-edited markdown", () => {
    const edited = deckPlanMarkdown()
      .replace(
        "국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
        "국내 기업의 AI 도입은 파일럿에서 운영 자동화로 이동 중이다.",
      )
      .replace("수치, 인사이트, 캡션", "차트 값, 핵심 문장, 출처 캡션");

    const result = parseDeckPlanMarkdown(edited);

    expect(result.specs[1]?.coreMessage).toBe(
      "국내 기업의 AI 도입은 파일럿에서 운영 자동화로 이동 중이다.",
    );
    expect(result.specs[1]?.editableElements).toEqual(["차트 값", "핵심 문장", "출처 캡션"]);
  });

  test("schema validation blocks incomplete slide specs", () => {
    const result = SlideSpecSchema.safeParse({
      number: 1,
      title: "Incomplete",
      role: "Problem",
      coreMessage: "Missing visual composition",
      bodyPoints: ["One point"],
      visualType: "",
      visualComposition: "",
      evidence: [],
      editableElements: ["Title"],
      dataSourceConstraints: ["claim_001"],
    });

    expect(result.success).toBe(false);
  });
});

function deckPlanMarkdown(): string {
  return [
    "# Deck Plan",
    "",
    "## Slide 1. Title",
    "- 제목: 검증 가능한 AI 슬라이드 제작 시스템",
    "- 역할: 덱의 주제와 신뢰 기반 포지셔닝 제시",
    "- 핵심 메시지: 승인·조사·편집성을 갖춘 제작 시스템",
    "- 본문 포인트: 승인 게이트, 출처 기반 조사, 편집 가능한 산출물",
    "- 시각화 방향: 미니멀한 제품 히어로 이미지 + 강한 타이포그래피",
    "- 사용할 근거: 없음",
    "- 편집 가능 요소: 제목, 부제, 날짜, 로고",
    "- 데이터/출처 제약: 구조 슬라이드라 사실 주장 없음",
    "",
    "## Slide 2. Market",
    "- 제목: 시장 변화가 만드는 기회",
    "- 역할: 시장 근거 제시",
    "- 핵심 메시지: 국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
    "- 본문 포인트: 2025년 국내 기업 도입률, 초기 도입에서 반복 제작 수요 발생",
    "- 시각화 방향: 막대 차트 + 인사이트 카드",
    "- 사용할 근거: claim_001, src_001, dataset_001",
    "- 편집 가능 요소: 수치, 인사이트, 캡션",
    "- 데이터/출처 제약: claim_001, src_001, dataset_001",
  ].join("\n");
}
