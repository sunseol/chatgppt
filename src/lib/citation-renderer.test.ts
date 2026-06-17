import { describe, expect, test } from "bun:test";
import {
  formatCitationsForSourceIds,
  formatReportCitation,
  formatSlideCitation,
  formatSourceMapCitation,
} from "./citation-renderer";
import type { Source } from "./research-types";

describe("citation renderer", () => {
  test("renders government source citations for slide report and source map surfaces", () => {
    const source = sourceFixture({
      id: "src_gov",
      sourceType: "government",
      grade: "A",
      usePolicy: "priority",
      title: "AI adoption report",
      publisher: "Statistics Office",
      year: 2026,
    });

    expect(formatSlideCitation(source)).toBe("Statistics Office (2026)");
    expect(formatReportCitation(source)).toBe(
      "[A/government] Statistics Office. AI adoption report. 2026.",
    );
    expect(formatSourceMapCitation(source)).toBe(
      "src_gov: Statistics Office (2026) · government · grade A",
    );
  });

  test("keeps company report URL and marks weak media sources for review", () => {
    const company = sourceFixture({
      id: "src_company",
      sourceType: "company",
      grade: "B",
      usePolicy: "allowed",
      title: "Product metrics disclosure",
      publisher: "Example Corp",
      year: 2026,
      url: "https://example.com/metrics",
    });
    const media = sourceFixture({
      id: "src_media",
      sourceType: "media",
      grade: "D",
      usePolicy: "restricted",
      title: "Market rumor",
      publisher: "Tech Daily",
      year: 2025,
    });

    expect(formatReportCitation(company)).toBe(
      "[B/company] Example Corp, Product metrics disclosure (2026). https://example.com/metrics",
    );
    expect(formatSlideCitation(media)).toBe("Tech Daily (2025) · 검토 필요");
    expect(formatReportCitation(media)).toBe(
      "[D/media] Tech Daily. Market rumor. 2025. · 검토 필요",
    );
  });

  test("marks explicitly uncertain citations and reports missing source ids", () => {
    const sources = [
      sourceFixture({ id: "src_a", sourceType: "research", publisher: "Lab", title: "Study" }),
      sourceFixture({ id: "src_b", sourceType: "academic", publisher: "Journal", title: "Paper" }),
    ];

    const rendered = formatCitationsForSourceIds({
      sourceIds: ["src_b", "src_missing", "src_a"],
      sources,
      audience: "source_map",
      uncertainSourceIds: ["src_a"],
    });

    expect(rendered).toEqual({
      citations: [
        "src_b: Journal (2026) · academic · grade A",
        "src_a: Lab (2026) · research · grade A · 검토 필요",
      ],
      missingSourceIds: ["src_missing"],
    });
  });
});

function sourceFixture(overrides: Partial<Source>): Source {
  return {
    id: "src_001",
    title: "Source title",
    publisher: "Publisher",
    year: 2026,
    grade: "A",
    sourceType: "government",
    usePolicy: "priority",
    ...overrides,
  };
}
