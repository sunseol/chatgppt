import type {
  Claim,
  ClaimConfidence,
  ClaimStatus,
  NumericEvidence,
  ResearchDataset,
  ResearchSourceType,
  Source,
  SourceUsePolicy,
  UsableSourceGrade,
} from "./research-types";

const CONFIDENCE = ["high", "medium", "low", "assumption"] as const;
const STATUS = ["supported", "uncertain", "assumption", "conflicting"] as const;
const GRADES = ["A", "B", "C", "D"] as const;
const USE_POLICIES = ["priority", "allowed", "supporting", "restricted"] as const;

export type ResearchConnector = {
  readonly id: string;
  readonly displayName: string;
  readonly sourceType: ResearchSourceType;
  readonly defaultGrade: UsableSourceGrade;
  readonly defaultUsePolicy: SourceUsePolicy;
  readonly run: (input: unknown) => unknown;
};

export class ResearchConnectorRegistryError extends Error {
  readonly name = "ResearchConnectorRegistryError";
}

export function createResearchConnectorRegistry(
  connectors: readonly ResearchConnector[],
): Readonly<Record<string, ResearchConnector>> {
  return connectors.reduce<Readonly<Record<string, ResearchConnector>>>(
    (registry, connector) => registerResearchConnector(registry, connector),
    {},
  );
}

export function registerResearchConnector(
  registry: Readonly<Record<string, ResearchConnector>>,
  connector: ResearchConnector,
): Readonly<Record<string, ResearchConnector>> {
  if (registry[connector.id] !== undefined) {
    throw new ResearchConnectorRegistryError(`Connector "${connector.id}" is already registered.`);
  }
  return { ...registry, [connector.id]: connector };
}

export function executeResearchConnector(
  registry: Readonly<Record<string, ResearchConnector>>,
  input: { readonly connectorId: string; readonly input: unknown },
): {
  readonly sources: readonly Source[];
  readonly claims: readonly Claim[];
  readonly datasets: readonly ResearchDataset[];
} {
  const connector = registry[input.connectorId];
  if (connector === undefined) {
    throw new ResearchConnectorRegistryError(`Unknown connector "${input.connectorId}".`);
  }
  const payload = readRecord(connector.run(input.input), "Connector payload must be an object.");
  const sources = readArray(payload.sources, "sources").map((item) =>
    normalizeSource(item, connector),
  );
  const datasets = readArray(payload.datasets, "datasets").map(normalizeDataset);
  const claims = readArray(payload.claims, "claims").map(normalizeClaim);
  const sourceIds = new Set(sources.map((source) => source.id));
  const datasetIds = new Set(datasets.map((dataset) => dataset.id));
  for (const dataset of datasets) {
    for (const sourceId of dataset.sourceIds) ensureKnownId(sourceIds, sourceId, "dataset source");
  }
  for (const claim of claims) {
    for (const sourceId of claim.sourceIds) ensureKnownId(sourceIds, sourceId, "claim source");
    for (const datasetId of claim.datasetIds) ensureKnownId(datasetIds, datasetId, "claim dataset");
  }
  return { sources, claims, datasets };
}

function normalizeSource(value: unknown, connector: ResearchConnector): Source {
  const record = readRecord(value, "Source must be an object.");
  const grade = readString(record.grade, "source.grade", connector.defaultGrade);
  const usePolicy = readString(record.usePolicy, "source.usePolicy", connector.defaultUsePolicy);
  if (!isUsableSourceGrade(grade)) {
    throw new ResearchConnectorRegistryError(`Unsupported source grade "${grade}".`);
  }
  if (!isSourceUsePolicy(usePolicy)) {
    throw new ResearchConnectorRegistryError(`Unsupported source use policy "${usePolicy}".`);
  }
  return {
    id: readString(record.id, "source.id"),
    title: readString(record.title, "source.title"),
    publisher: readString(record.publisher, "source.publisher"),
    year: readNumber(record.year, "source.year"),
    grade: grade as UsableSourceGrade,
    sourceType: connector.sourceType,
    usePolicy: usePolicy as SourceUsePolicy,
  };
}

function normalizeDataset(value: unknown): ResearchDataset {
  const record = readRecord(value, "Dataset must be an object.");
  return {
    id: readString(record.id, "dataset.id"),
    title: readString(record.title, "dataset.title"),
    sourceIds: readStringArray(record.sourceIds, "dataset.sourceIds"),
    unit: readString(record.unit, "dataset.unit"),
    period: readString(record.period, "dataset.period"),
    geography: readString(record.geography, "dataset.geography"),
    definition: readString(record.definition, "dataset.definition"),
    rows: readArray(record.rows, "dataset.rows").map((row, index) =>
      normalizeDatasetRow(row, index),
    ),
    uncertain: readBoolean(record.uncertain, "dataset.uncertain", false),
  };
}

function normalizeClaim(value: unknown): Claim {
  const record = readRecord(value, "Claim must be an object.");
  const confidence = readString(record.confidence, "claim.confidence");
  const status = readString(record.status, "claim.status");
  if (!isClaimConfidence(confidence)) {
    throw new ResearchConnectorRegistryError(`Unsupported claim confidence "${confidence}".`);
  }
  if (!isClaimStatus(status)) {
    throw new ResearchConnectorRegistryError(`Unsupported claim status "${status}".`);
  }
  return {
    id: readString(record.id, "claim.id"),
    statement: readString(record.statement, "claim.statement"),
    sourceIds: readStringArray(record.sourceIds, "claim.sourceIds"),
    datasetIds: readStringArray(record.datasetIds, "claim.datasetIds"),
    confidence: confidence as ClaimConfidence,
    hasNumber: readBoolean(record.hasNumber, "claim.hasNumber"),
    needsUserReview: readBoolean(record.needsUserReview, "claim.needsUserReview"),
    status: status as ClaimStatus,
    slideCandidates: readNumberArray(record.slideCandidates, "claim.slideCandidates"),
    numericEvidence: readArray(record.numericEvidence, "claim.numericEvidence").map(
      normalizeNumericEvidence,
    ),
  };
}

function normalizeDatasetRow(value: unknown, index: number): ResearchDataset["rows"][number] {
  const record = readRecord(value, `dataset.rows[${index}] must be an object.`);
  const year = readOptionalNumber(record.year, `dataset.rows[${index}].year`);
  const segment = readOptionalString(record.segment, `dataset.rows[${index}].segment`);
  return {
    label: readString(record.label, `dataset.rows[${index}].label`),
    value: readNumber(record.value, `dataset.rows[${index}].value`),
    ...(year === undefined ? {} : { year }),
    ...(segment === undefined ? {} : { segment }),
  };
}

function normalizeNumericEvidence(value: unknown, index: number): NumericEvidence {
  const record = readRecord(value, `claim.numericEvidence[${index}] must be an object.`);
  const sourceId = readOptionalString(record.sourceId, `claim.numericEvidence[${index}].sourceId`);
  const datasetId = readOptionalString(
    record.datasetId,
    `claim.numericEvidence[${index}].datasetId`,
  );
  const uncertain = readOptionalBoolean(
    record.uncertain,
    `claim.numericEvidence[${index}].uncertain`,
  );
  return {
    id: readString(record.id, `claim.numericEvidence[${index}].id`),
    value: readString(record.value, `claim.numericEvidence[${index}].value`),
    unit: readString(record.unit, `claim.numericEvidence[${index}].unit`),
    baseYear: readNumber(record.baseYear, `claim.numericEvidence[${index}].baseYear`),
    geography: readString(record.geography, `claim.numericEvidence[${index}].geography`),
    definition: readString(record.definition, `claim.numericEvidence[${index}].definition`),
    ...(sourceId === undefined ? {} : { sourceId }),
    ...(datasetId === undefined ? {} : { datasetId }),
    ...(uncertain === undefined ? {} : { uncertain }),
  };
}

function ensureKnownId(ids: ReadonlySet<string>, value: string, label: string): void {
  if (!ids.has(value)) throw new ResearchConnectorRegistryError(`Unknown ${label} id "${value}".`);
}

function readRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ResearchConnectorRegistryError(message);
  }
  return value as Record<string, unknown>;
}

function readArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value))
    throw new ResearchConnectorRegistryError(`Field "${label}" must be an array.`);
  return value;
}

function readString(value: unknown, label: string, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ResearchConnectorRegistryError(`Field "${label}" must be a non-empty string.`);
  }
  return value.trim();
}

function readStringArray(value: unknown, label: string): string[] {
  return readArray(value, label).map((item, index) => readString(item, `${label}[${index}]`));
}

function readNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ResearchConnectorRegistryError(`Field "${label}" must be a finite number.`);
  }
  return value;
}

function readOptionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  return readNumber(value, label);
}

function readNumberArray(value: unknown, label: string): number[] {
  return readArray(value, label).map((item, index) => readNumber(item, `${label}[${index}]`));
}

function readBoolean(value: unknown, label: string, fallback?: boolean): boolean {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "boolean") {
    throw new ResearchConnectorRegistryError(`Field "${label}" must be a boolean.`);
  }
  return value;
}

function readOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  return readString(value, label);
}

function readOptionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined) return undefined;
  return readBoolean(value, label);
}

function isUsableSourceGrade(value: string): value is UsableSourceGrade {
  return GRADES.includes(value as UsableSourceGrade);
}

function isSourceUsePolicy(value: string): value is SourceUsePolicy {
  return USE_POLICIES.includes(value as SourceUsePolicy);
}

function isClaimConfidence(value: string): value is ClaimConfidence {
  return CONFIDENCE.includes(value as ClaimConfidence);
}

function isClaimStatus(value: string): value is ClaimStatus {
  return STATUS.includes(value as ClaimStatus);
}
