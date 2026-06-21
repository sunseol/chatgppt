import { describe, expect, test } from "bun:test";
import { evaluateLiveManualQaEvidence } from "./live-manual-qa-evidence";
import { completeLiveManualQaEvidence as completeEvidence } from "./live-manual-qa-test-fixtures";

describe("live manual QA source evidence", () => {
  test("blocks reserved documentation IPs as real opened sources", () => {
    // Given
    const evidence = completeEvidence({
      openedRealSourceUrls: ["https://203.0.113.10/source"],
      finalReportSourceUrls: ["https://203.0.113.10/source"],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["placeholder_real_source_url"]);
  });

  test("blocks opened source URLs that only become valid after trimming", () => {
    // Given
    const evidence = completeEvidence({
      openedRealSourceUrls: [" https://www.w3.org/TR/WCAG22/ "],
      finalReportSourceUrls: ["https://www.w3.org/TR/WCAG22/"],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid_real_source_url"]);
  });

  test("blocks final report source URLs that only match after trimming", () => {
    // Given
    const evidence = completeEvidence({
      openedRealSourceUrls: ["https://www.w3.org/TR/WCAG22/"],
      finalReportSourceUrls: [" https://www.w3.org/TR/WCAG22/ "],
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["opened_source_not_in_report"]);
  });
});
