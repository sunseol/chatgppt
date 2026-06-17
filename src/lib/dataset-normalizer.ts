import type {
  ChartType,
  ResearchChart,
  ResearchDataset,
  ResearchDatasetRow,
} from "./research-types";

export type DatasetSourceKind = "csv" | "xlsx" | "table" | "api";
export type MissingValueStrategy = "omit_row" | "zero_fill" | "review_required";
export type DatasetNormalizationErrorReason = "non_numeric_value" | "empty_dataset";

export type TabularDatasetRowInput = {
  readonly label: string;
  readonly value: string | number | null;
  readonly year?: number;
  readonly segment?: string;
};

export type DatasetChartNormalizationInput = {
  readonly id: string;
  readonly title: string;
  readonly chartType: ChartType;
  readonly slideCandidates: readonly number[];
};

export type DatasetNormalizationInput = {
  readonly datasetId: string;
  readonly title: string;
  readonly sourceIds: readonly string[];
  readonly sourceKind: DatasetSourceKind;
  readonly unit: string;
  readonly period: string;
  readonly geography: string;
  readonly definition: string;
  readonly missingValueStrategy: MissingValueStrategy;
  readonly rows: readonly TabularDatasetRowInput[];
  readonly chart?: DatasetChartNormalizationInput;
  readonly uncertain?: boolean;
};

export type MissingValuePolicy = {
  readonly strategy: MissingValueStrategy;
  readonly omittedLabels: readonly string[];
  readonly rowCountBefore: number;
  readonly rowCountAfter: number;
};

export type DatasetNormalizationMetadata = {
  readonly sourceKind: DatasetSourceKind;
  readonly missingValuePolicy: MissingValuePolicy;
};

export type NormalizedDatasetPackage = {
  readonly dataset: ResearchDataset;
  readonly normalization: DatasetNormalizationMetadata;
  readonly chart?: ResearchChart;
};

export class DatasetNormalizationError extends Error {
  readonly name = "DatasetNormalizationError";

  constructor(
    readonly reason: DatasetNormalizationErrorReason,
    readonly rowLabel: string,
    readonly rawValue: string,
  ) {
    super(`Cannot normalize dataset row "${rowLabel}" with value "${rawValue}": ${reason}.`);
  }
}

export function normalizeTabularDataset(
  input: DatasetNormalizationInput,
): NormalizedDatasetPackage {
  const rows: ResearchDatasetRow[] = [];
  const omittedLabels: string[] = [];

  input.rows.forEach((row) => {
    const normalized = normalizeRow(row, input.missingValueStrategy);
    if (normalized === undefined) {
      omittedLabels.push(row.label);
      return;
    }
    rows.push(normalized);
  });

  if (rows.length === 0) {
    throw new DatasetNormalizationError("empty_dataset", input.datasetId, "no normalized rows");
  }

  const uncertain = input.uncertain ?? input.missingValueStrategy === "review_required";
  const dataset: ResearchDataset = {
    id: input.datasetId,
    title: input.title,
    sourceIds: [...input.sourceIds],
    unit: input.unit,
    period: input.period,
    geography: input.geography,
    definition: input.definition,
    rows,
    uncertain,
  };

  return {
    dataset,
    normalization: {
      sourceKind: input.sourceKind,
      missingValuePolicy: {
        strategy: input.missingValueStrategy,
        omittedLabels,
        rowCountBefore: input.rows.length,
        rowCountAfter: rows.length,
      },
    },
    ...(input.chart === undefined ? {} : { chart: createChart(input, uncertain) }),
  };
}

function normalizeRow(
  row: TabularDatasetRowInput,
  missingValueStrategy: MissingValueStrategy,
): ResearchDatasetRow | undefined {
  const value = normalizeValue(row, missingValueStrategy);
  if (value === undefined) return undefined;
  return {
    label: row.label,
    value,
    ...(row.year === undefined ? {} : { year: row.year }),
    ...(row.segment === undefined ? {} : { segment: row.segment }),
  };
}

function normalizeValue(
  row: TabularDatasetRowInput,
  missingValueStrategy: MissingValueStrategy,
): number | undefined {
  if (row.value === null || row.value === "") {
    return valueForMissingRow(missingValueStrategy);
  }
  if (typeof row.value === "number") return row.value;

  const parsed = Number(row.value);
  if (Number.isFinite(parsed)) return parsed;
  throw new DatasetNormalizationError("non_numeric_value", row.label, row.value);
}

function valueForMissingRow(strategy: MissingValueStrategy): number | undefined {
  switch (strategy) {
    case "omit_row":
    case "review_required":
      return undefined;
    case "zero_fill":
      return 0;
    default:
      return assertNever(strategy);
  }
}

function createChart(input: DatasetNormalizationInput, uncertain: boolean): ResearchChart {
  const chart = input.chart;
  if (chart === undefined) {
    throw new DatasetNormalizationError("empty_dataset", input.datasetId, "missing chart");
  }
  return {
    id: chart.id,
    title: chart.title,
    chartType: chart.chartType,
    datasetId: input.datasetId,
    unit: input.unit,
    period: input.period,
    sourceIds: [...input.sourceIds],
    slideCandidates: [...chart.slideCandidates],
    uncertain,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected missing value strategy: ${String(value)}`);
}
