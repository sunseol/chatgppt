import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOC_PATH = new URL("../../docs/df154-manual-qa-scenarios.md", import.meta.url);

describe("DF-154 manual QA scenario document", () => {
  test("keeps the required tester-facing sections", () => {
    const text = readManualQaDoc();

    for (const section of requiredSections()) {
      expect(text.includes(section)).toBe(true);
    }
  });

  test("contains executable checklist items and measurable pass criteria", () => {
    const text = readManualQaDoc();
    const checklistCount = text.split("\n").filter((line) => line.startsWith("- [ ]")).length;

    expect(checklistCount >= 18).toBe(true);
    expect(text.includes("10분")).toBe(true);
    expect(text.includes("5분")).toBe(true);
    expect(text.includes("Pass threshold")).toBe(true);
    expect(text.includes("QA Dry Run 기록")).toBe(true);
  });
});

function readManualQaDoc(): string {
  return readFileSync(DOC_PATH, "utf8");
}

function requiredSections(): readonly string[] {
  return [
    "# DF-154 Manual QA Scenarios",
    "## 사전 준비",
    "## 10분 신규 프로젝트 생성",
    "## 5분 편집 검증",
    "## 최종 보고 이해 가능성",
    "## 관찰 지표",
    "## 합격 기준",
    "## QA Dry Run 기록",
  ];
}
