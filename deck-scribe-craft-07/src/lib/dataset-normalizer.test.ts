import { describe, expect, test } from "bun:test";
import { DatasetNormalizationError, normalizeTabularDataset } from "./dataset-normalizer";

describe("dataset normalizer", () => {
  test("normalizes CSV-like rows into the common research dataset schema", () => {
    const normalized = normalizeTabularDataset({
      datasetId: "dataset_ai_adoption",
      title: "AI adoption",
      sourceIds: ["src_gov"],
      sourceKind: "csv",
      unit: "%",
      period: "2023-2025",
      geography: "KR",
      definition: "기업 AI 도구 시범 도입 비율",
      missingValueStrategy: "omit_row",
      rows: [
        { label: "2023", value: "42", year: 2023 },
        { label: "2024", value: 56, year: 2024 },
        { label: "2025", value: "67", year: 2025, segment: "all" },
      ],
      chart: {
        id: "chart_ai_adoption",
        title: "AI adoption trend",
        chartType: "bar",
        slideCandidates: [3],
      },
    });

    expect(normalized.dataset).toEqual({
      id: "dataset_ai_adoption",
      title: "AI adoption",
      sourceIds: ["src_gov"],
      unit: "%",
      period: "2023-2025",
      geography: "KR",
      definition: "기업 AI 도구 시범 도입 비율",
      rows: [
        { label: "2023", value: 42, year: 2023 },
        { label: "2024", value: 56, year: 2024 },
        { label: "2025", value: 67, year: 2025, segment: "all" },
      ],
      uncertain: false,
    });
    expect(normalized.normalization).toEqual({
      sourceKind: "csv",
      missingValuePolicy: {
        strategy: "omit_row",
        omittedLabels: [],
        rowCountBefore: 3,
        rowCountAfter: 3,
      },
    });
    expect(normalized.chart).toEqual({
      id: "chart_ai_adoption",
      title: "AI adoption trend",
      chartType: "bar",
      datasetId: "dataset_ai_adoption",
      unit: "%",
      period: "2023-2025",
      sourceIds: ["src_gov"],
      slideCandidates: [3],
      uncertain: false,
    });
  });

  test("records omitted missing values without silently losing the handling rule", () => {
    const normalized = normalizeTabularDataset({
      datasetId: "dataset_revenue",
      title: "Revenue",
      sourceIds: ["src_table"],
      sourceKind: "table",
      unit: "USD",
      period: "2026",
      geography: "US",
      definition: "Quarterly revenue",
      missingValueStrategy: "omit_row",
      rows: [
        { label: "Q1", value: "12.5" },
        { label: "Q2", value: "" },
        { label: "Q3", value: null },
      ],
    });

    expect(normalized.dataset.rows).toEqual([{ label: "Q1", value: 12.5 }]);
    expect(normalized.normalization.missingValuePolicy).toEqual({
      strategy: "omit_row",
      omittedLabels: ["Q2", "Q3"],
      rowCountBefore: 3,
      rowCountAfter: 1,
    });
  });

  test("links API dataset output to chart metadata", () => {
    const normalized = normalizeTabularDataset({
      datasetId: "dataset_api_users",
      title: "Monthly active users",
      sourceIds: ["src_api"],
      sourceKind: "api",
      unit: "users",
      period: "2026 H1",
      geography: "Global",
      definition: "Monthly active users from product API",
      missingValueStrategy: "omit_row",
      rows: [{ label: "June", value: 4200, segment: "paid" }],
      chart: {
        id: "chart_api_users",
        title: "MAU by month",
        chartType: "line",
        slideCandidates: [5],
      },
      uncertain: true,
    });

    expect(normalized.chart?.datasetId).toBe("dataset_api_users");
    expect(normalized.chart?.chartType).toBe("line");
    expect(normalized.chart?.uncertain).toBe(true);
    expect(normalized.normalization.sourceKind).toBe("api");
  });

  test("rejects non-numeric values with a typed normalization error", () => {
    expect(() =>
      normalizeTabularDataset({
        datasetId: "dataset_bad",
        title: "Bad data",
        sourceIds: ["src_bad"],
        sourceKind: "xlsx",
        unit: "%",
        period: "2026",
        geography: "KR",
        definition: "Invalid value fixture",
        missingValueStrategy: "omit_row",
        rows: [{ label: "bad", value: "not available" }],
      }),
    ).toThrow(DatasetNormalizationError);
  });
});
