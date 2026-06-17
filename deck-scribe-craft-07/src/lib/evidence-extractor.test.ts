import { describe, expect, test } from "bun:test";
import {
  createEvidenceValidationCandidates,
  extractEvidenceFromSource,
} from "./evidence-extractor";

describe("evidence extractor", () => {
  test("extracts claim and numeric evidence with quote spans", () => {
    const rawContent = [
      "공식 보고서: 국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
      "CLAIM | statement=국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
      "NUMBER | value=67 | unit=% | baseYear=2025 | geography=KR | definition=국내 기업 AI 도구 시범 도입 비율 | quote=67%",
    ].join("\n");

    const result = extractEvidenceFromSource({ sourceId: "src_003", rawContent });

    expect(result.items.length).toBe(2);
    expect(result.items[0].sourceId).toBe("src_003");
    expect(result.items[0].quoteSpan?.text).toBe("국내 기업의 67%가 AI 도구를 시범 도입 중이다.");
    expect(result.items[1].value).toBe("67");
    expect(result.items[1].unit).toBe("%");
    expect(result.items[1].baseYear).toBe(2025);
    expect(result.items[1].geography).toBe("KR");
    expect(result.items[1].definition).toBe("국내 기업 AI 도구 시범 도입 비율");
    expect(result.items[1].quoteSpan?.text).toBe("67%");
    expect(result.items[1].needsUserReview).toBe(false);
  });

  test("marks incomplete numeric evidence for review", () => {
    const result = extractEvidenceFromSource({
      sourceId: "src_004",
      rawContent: "NUMBER | value=42 | quote=42",
    });

    expect(result.items[0].needsUserReview).toBe(true);
    expect(result.items[0].reviewReasons).toEqual([
      "unit missing",
      "baseYear missing",
      "geography missing",
      "definition missing",
    ]);
  });

  test("extracts table referenced evidence", () => {
    const result = extractEvidenceFromSource({
      sourceId: "src_table",
      rawContent:
        "TABLE | tableId=tbl_1 | rowKey=2025 | columnKey=adoption_rate | statement=2025년 도입률은 67%이다.",
    });

    expect(result.items[0].sourceId).toBe("src_table");
    expect(result.items[0].tableRef).toEqual({
      tableId: "tbl_1",
      rowKey: "2025",
      columnKey: "adoption_rate",
    });
    expect(result.items[0].quoteSpan).toBe(undefined);
  });

  test("creates validator handoff candidates", () => {
    const result = extractEvidenceFromSource({
      sourceId: "src_003",
      rawContent: [
        "공식 보고서: 국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
        "CLAIM | statement=국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
        "NUMBER | value=67 | unit=% | baseYear=2025 | geography=KR | definition=국내 기업 AI 도구 시범 도입 비율 | quote=67%",
      ].join("\n"),
    });

    const candidates = createEvidenceValidationCandidates(result);

    expect(candidates).toEqual([
      {
        id: "candidate_001",
        statement: "국내 기업의 67%가 AI 도구를 시범 도입 중이다.",
        sourceIds: ["src_003"],
        needsUserReview: false,
        numericEvidence: [
          {
            value: "67",
            unit: "%",
            baseYear: 2025,
            geography: "KR",
            definition: "국내 기업 AI 도구 시범 도입 비율",
            sourceId: "src_003",
          },
        ],
      },
    ]);
  });
});
