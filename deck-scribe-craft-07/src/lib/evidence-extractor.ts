import type { ClaimConfidence, ClaimStatus } from "./research-types";

export type EvidenceKind = "claim" | "number" | "table";

export interface QuoteSpan {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export interface TableReference {
  readonly tableId: string;
  readonly rowKey: string;
  readonly columnKey: string;
}

export interface EvidenceItem {
  readonly id: string;
  readonly kind: EvidenceKind;
  readonly sourceId: string;
  readonly statement?: string;
  readonly confidence?: ClaimConfidence;
  readonly status?: ClaimStatus;
  readonly value?: string;
  readonly unit?: string;
  readonly baseYear?: number;
  readonly geography?: string;
  readonly definition?: string;
  readonly quoteSpan?: QuoteSpan;
  readonly tableRef?: TableReference;
  readonly needsUserReview: boolean;
  readonly reviewReasons: readonly string[];
}

export interface ExtractEvidenceInput {
  readonly sourceId: string;
  readonly rawContent: string;
}

export interface EvidenceExtractionResult {
  readonly sourceId: string;
  readonly items: readonly EvidenceItem[];
}

export interface CandidateNumericEvidence {
  readonly value: string;
  readonly unit: string;
  readonly baseYear: number;
  readonly geography: string;
  readonly definition: string;
  readonly sourceId: string;
}

export interface EvidenceValidationCandidate {
  readonly id: string;
  readonly statement: string;
  readonly sourceIds: readonly string[];
  readonly needsUserReview: boolean;
  readonly confidence?: ClaimConfidence;
  readonly status?: ClaimStatus;
  readonly numericEvidence: readonly CandidateNumericEvidence[];
}

export function extractEvidenceFromSource(input: ExtractEvidenceInput): EvidenceExtractionResult {
  const items: EvidenceItem[] = [];
  for (const line of input.rawContent.split(/\r?\n/)) {
    const item = parseEvidenceLine(line, input, items.length + 1);
    if (item) items.push(item);
  }
  return { sourceId: input.sourceId, items };
}

export function createEvidenceValidationCandidates(
  result: EvidenceExtractionResult,
): EvidenceValidationCandidate[] {
  const candidates: MutableEvidenceValidationCandidate[] = [];
  for (const item of result.items) {
    if (item.kind === "claim" || item.kind === "table") {
      candidates.push({
        id: `candidate_${String(candidates.length + 1).padStart(3, "0")}`,
        statement: item.statement ?? "",
        sourceIds: [item.sourceId],
        needsUserReview: item.needsUserReview,
        ...(item.confidence === undefined ? {} : { confidence: item.confidence }),
        ...(item.status === undefined ? {} : { status: item.status }),
        numericEvidence: [],
      });
      continue;
    }
    const current = candidates[candidates.length - 1];
    if (!current || item.needsUserReview) continue;
    current.numericEvidence.push({
      value: item.value ?? "",
      unit: item.unit ?? "",
      baseYear: item.baseYear ?? 0,
      geography: item.geography ?? "",
      definition: item.definition ?? "",
      sourceId: item.sourceId,
    });
  }
  return candidates.map((candidate) => ({
    ...candidate,
    sourceIds: Object.freeze([...candidate.sourceIds]),
    numericEvidence: Object.freeze([...candidate.numericEvidence]),
  }));
}

interface MutableEvidenceValidationCandidate {
  readonly id: string;
  readonly statement: string;
  readonly sourceIds: string[];
  needsUserReview: boolean;
  readonly confidence?: ClaimConfidence;
  readonly status?: ClaimStatus;
  numericEvidence: CandidateNumericEvidence[];
}

function parseEvidenceLine(
  line: string,
  input: ExtractEvidenceInput,
  index: number,
): EvidenceItem | undefined {
  const trimmed = line.trim();
  if (trimmed.startsWith("CLAIM |")) return parseClaimLine(trimmed, input, index);
  if (trimmed.startsWith("NUMBER |")) return parseNumberLine(trimmed, input, index);
  if (trimmed.startsWith("TABLE |")) return parseTableLine(trimmed, input, index);
  return undefined;
}

function parseClaimLine(line: string, input: ExtractEvidenceInput, index: number): EvidenceItem {
  const fields = parseFields(line);
  const statement = fields.get("statement") ?? "";
  return {
    id: createEvidenceId("claim", index),
    kind: "claim",
    sourceId: input.sourceId,
    statement,
    ...claimSignalFields(fields),
    quoteSpan: findQuoteSpan(input.rawContent, statement),
    needsUserReview: false,
    reviewReasons: [],
  };
}

function parseNumberLine(line: string, input: ExtractEvidenceInput, index: number): EvidenceItem {
  const fields = parseFields(line);
  const baseYear = parseOptionalYear(fields.get("baseYear"));
  const reviewReasons = numberReviewReasons(fields, baseYear);
  const quote = fields.get("quote") ?? fields.get("value") ?? "";
  return {
    id: createEvidenceId("number", index),
    kind: "number",
    sourceId: input.sourceId,
    value: fields.get("value"),
    unit: fields.get("unit"),
    ...(baseYear === undefined ? {} : { baseYear }),
    geography: fields.get("geography"),
    definition: fields.get("definition"),
    quoteSpan: findQuoteSpan(input.rawContent, quote),
    needsUserReview: reviewReasons.length > 0,
    reviewReasons,
  };
}

function parseTableLine(line: string, input: ExtractEvidenceInput, index: number): EvidenceItem {
  const fields = parseFields(line);
  return {
    id: createEvidenceId("table", index),
    kind: "table",
    sourceId: input.sourceId,
    statement: fields.get("statement"),
    ...claimSignalFields(fields),
    tableRef: {
      tableId: fields.get("tableId") ?? "",
      rowKey: fields.get("rowKey") ?? "",
      columnKey: fields.get("columnKey") ?? "",
    },
    needsUserReview: false,
    reviewReasons: [],
  };
}

function claimSignalFields(
  fields: ReadonlyMap<string, string>,
): Pick<EvidenceItem, "confidence" | "status"> {
  const confidence = fields.get("confidence");
  const status = fields.get("status");
  return {
    ...(isClaimConfidence(confidence) ? { confidence } : {}),
    ...(isClaimStatus(status) ? { status } : {}),
  };
}

function isClaimConfidence(value: string | undefined): value is ClaimConfidence {
  return value === "high" || value === "medium" || value === "low" || value === "assumption";
}

function isClaimStatus(value: string | undefined): value is ClaimStatus {
  return (
    value === "supported" ||
    value === "uncertain" ||
    value === "assumption" ||
    value === "conflicting"
  );
}

function parseFields(line: string): ReadonlyMap<string, string> {
  const fields = new Map<string, string>();
  for (const chunk of line.split("|").slice(1)) {
    const trimmed = chunk.trim();
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    fields.set(trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim());
  }
  return fields;
}

function parseOptionalYear(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function numberReviewReasons(
  fields: ReadonlyMap<string, string>,
  baseYear: number | undefined,
): string[] {
  const reasons: string[] = [];
  if (!fields.get("unit")) reasons.push("unit missing");
  if (baseYear === undefined) reasons.push("baseYear missing");
  if (!fields.get("geography")) reasons.push("geography missing");
  if (!fields.get("definition")) reasons.push("definition missing");
  return reasons;
}

function findQuoteSpan(rawContent: string, quote: string): QuoteSpan | undefined {
  if (!quote) return undefined;
  const start = rawContent.indexOf(quote);
  if (start < 0) return undefined;
  return { start, end: start + quote.length, text: quote };
}

function createEvidenceId(kind: EvidenceKind, index: number): string {
  return `${kind}_${String(index).padStart(3, "0")}`;
}
