import type { Claim, ResearchDataset, ResearchPack, SlideSpec, Source } from "./deck-types";

export type SlideSourceMapIssueCode = "source_less_number" | "unknown_reference";
export type SlideSourceMapSeverity = "fatal" | "warning";

export interface SlideSourceMapIssue {
  readonly code: SlideSourceMapIssueCode;
  readonly severity: SlideSourceMapSeverity;
  readonly slideId: string;
  readonly message: string;
  readonly claimId?: string;
  readonly referenceId?: string;
}

export interface SlideSourceMapEntry {
  readonly slideId: string;
  readonly slideNumber: number;
  readonly claimIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly datasetIds: readonly string[];
  readonly rejectedClaimIds: readonly string[];
}

export interface MinimalSlideSourceMap {
  readonly entries: readonly SlideSourceMapEntry[];
  readonly issues: readonly SlideSourceMapIssue[];
  readonly fatalIssues: readonly SlideSourceMapIssue[];
}

export interface BuildMinimalSlideSourceMapInput {
  readonly slides: readonly SlideSpec[];
  readonly research: ResearchPack;
}

export interface SlidePromptSourceMapReference {
  readonly slideId: string;
  readonly sourceMapIds: readonly string[];
  readonly claimIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly datasetIds: readonly string[];
}

interface SourceMapLookup {
  readonly claims: ReadonlyMap<string, Claim>;
  readonly sources: ReadonlyMap<string, Source>;
  readonly datasets: ReadonlyMap<string, ResearchDataset>;
}

interface EntryAccumulator {
  readonly slideId: string;
  readonly slideNumber: number;
  readonly claimIds: string[];
  readonly sourceIds: string[];
  readonly datasetIds: string[];
  readonly rejectedClaimIds: string[];
}

export function buildMinimalSlideSourceMap(
  input: BuildMinimalSlideSourceMapInput,
): MinimalSlideSourceMap {
  const lookup = createLookup(input.research);
  const issues: SlideSourceMapIssue[] = [];
  const entries = input.slides.map((slide) => buildEntry(slide, lookup, issues));
  const fatalIssues = issues.filter((issue) => issue.severity === "fatal");

  return Object.freeze({
    entries: Object.freeze(entries),
    issues: Object.freeze(issues),
    fatalIssues: Object.freeze(fatalIssues),
  });
}

export function formatMinimalSourceMapForReport(map: MinimalSlideSourceMap): string {
  const lines = ["## 4. 슬라이드별 근거 맵"];
  if (map.entries.length === 0) {
    lines.push("- 없음");
  } else {
    map.entries.forEach((entry) => {
      lines.push(
        `- ${entry.slideId}: claims ${joinIds(entry.claimIds)} | sources ${joinIds(
          entry.sourceIds,
        )} | datasets ${joinIds(entry.datasetIds)}`,
      );
    });
  }

  if (map.issues.length > 0) {
    lines.push("");
    lines.push("### Source Map Issues");
    map.issues.forEach((issue) => lines.push(`- [${issue.severity}] ${issue.message}`));
  }

  return lines.join("\n");
}

export function createSlidePromptSourceMapReference(
  entry: SlideSourceMapEntry,
): SlidePromptSourceMapReference {
  return {
    slideId: entry.slideId,
    sourceMapIds: [...entry.claimIds, ...entry.sourceIds, ...entry.datasetIds],
    claimIds: [...entry.claimIds],
    sourceIds: [...entry.sourceIds],
    datasetIds: [...entry.datasetIds],
  };
}

function createLookup(research: ResearchPack): SourceMapLookup {
  return {
    claims: new Map(research.claims.map((claim) => [claim.id, claim])),
    sources: new Map(research.sources.map((source) => [source.id, source])),
    datasets: new Map(research.datasets.map((dataset) => [dataset.id, dataset])),
  };
}

function buildEntry(
  slide: SlideSpec,
  lookup: SourceMapLookup,
  issues: SlideSourceMapIssue[],
): SlideSourceMapEntry {
  const entry: EntryAccumulator = {
    slideId: formatSlideId(slide.number),
    slideNumber: slide.number,
    claimIds: [],
    sourceIds: [],
    datasetIds: [],
    rejectedClaimIds: [],
  };

  for (const reference of slideReferences(slide)) {
    applyReference(reference, entry, lookup, issues);
  }

  return {
    slideId: entry.slideId,
    slideNumber: entry.slideNumber,
    claimIds: Object.freeze([...entry.claimIds]),
    sourceIds: Object.freeze([...entry.sourceIds]),
    datasetIds: Object.freeze([...entry.datasetIds]),
    rejectedClaimIds: Object.freeze([...entry.rejectedClaimIds]),
  };
}

function slideReferences(slide: SlideSpec): readonly string[] {
  const references: string[] = [];
  [...slide.evidence, ...(slide.dataSourceConstraints ?? [])].forEach((reference) => {
    const trimmed = reference.trim();
    if (trimmed.length > 0) appendUnique(references, trimmed);
  });
  return references;
}

function applyReference(
  reference: string,
  entry: EntryAccumulator,
  lookup: SourceMapLookup,
  issues: SlideSourceMapIssue[],
) {
  const claim = lookup.claims.get(reference);
  if (claim) {
    applyClaim(claim, entry, lookup, issues);
    return;
  }

  if (lookup.sources.has(reference)) {
    appendUnique(entry.sourceIds, reference);
    return;
  }

  const dataset = lookup.datasets.get(reference);
  if (dataset) {
    applyDataset(dataset, entry);
    return;
  }

  if (isReferenceLike(reference)) {
    issues.push({
      code: "unknown_reference",
      severity: "warning",
      slideId: entry.slideId,
      referenceId: reference,
      message: `Slide ${entry.slideId} references unknown source map id ${reference}.`,
    });
  }
}

function applyClaim(
  claim: Claim,
  entry: EntryAccumulator,
  lookup: SourceMapLookup,
  issues: SlideSourceMapIssue[],
) {
  if (claim.hasNumber && claim.sourceIds.length === 0 && claim.datasetIds.length === 0) {
    appendUnique(entry.rejectedClaimIds, claim.id);
    issues.push({
      code: "source_less_number",
      severity: "fatal",
      slideId: entry.slideId,
      claimId: claim.id,
      message: `Slide ${entry.slideId} references numeric claim ${claim.id} without source or dataset.`,
    });
    return;
  }

  appendUnique(entry.claimIds, claim.id);
  claim.sourceIds.forEach((sourceId) => appendUnique(entry.sourceIds, sourceId));
  claim.datasetIds.forEach((datasetId) => {
    appendUnique(entry.datasetIds, datasetId);
    const dataset = lookup.datasets.get(datasetId);
    dataset?.sourceIds.forEach((sourceId) => appendUnique(entry.sourceIds, sourceId));
  });
}

function applyDataset(dataset: ResearchDataset, entry: EntryAccumulator) {
  appendUnique(entry.datasetIds, dataset.id);
  dataset.sourceIds.forEach((sourceId) => appendUnique(entry.sourceIds, sourceId));
}

function appendUnique(values: string[], value: string) {
  if (!values.includes(value)) values.push(value);
}

function joinIds(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}

function formatSlideId(slideNumber: number): string {
  return `slide_${String(slideNumber).padStart(2, "0")}`;
}

function isReferenceLike(reference: string): boolean {
  return /^(claim|src|source|dataset)_/.test(reference);
}
