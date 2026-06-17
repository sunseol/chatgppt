import type { Claim, ResearchDataset, ResearchPack, Source } from "./deck-types";
import type {
  MinimalSlideSourceMap,
  SlideSourceMapEntry,
  SlideSourceMapIssue,
} from "./slide-source-map";

export type SourceMapReviewReferenceKind = "claim" | "source" | "dataset";
export type SourceMapReviewSlideStatus = "ready" | "blocked" | "empty";
export type ImageGenerationSourceMapGateStatus = "ready" | "blocked";

export interface SourceMapReviewReference {
  readonly kind: SourceMapReviewReferenceKind;
  readonly id: string;
  readonly label: string;
}

export interface SlideSourceMapReviewEntry {
  readonly slideId: string;
  readonly slideNumber: number;
  readonly status: SourceMapReviewSlideStatus;
  readonly claims: readonly SourceMapReviewReference[];
  readonly sources: readonly SourceMapReviewReference[];
  readonly datasets: readonly SourceMapReviewReference[];
  readonly rejectedClaims: readonly SourceMapReviewReference[];
  readonly issueMessages: readonly string[];
}

export interface ImageGenerationSourceMapGate {
  readonly status: ImageGenerationSourceMapGateStatus;
  readonly blockedSlideIds: readonly string[];
  readonly reasons: readonly string[];
}

export interface SlideSourceMapReview {
  readonly slides: readonly SlideSourceMapReviewEntry[];
  readonly issueCount: number;
  readonly fatalIssueCount: number;
  readonly imageGenerationGate: ImageGenerationSourceMapGate;
}

export interface CreateSlideSourceMapReviewInput {
  readonly map: MinimalSlideSourceMap;
  readonly research: ResearchPack;
}

export interface SlideSourceMapCorrection {
  readonly slideId: string;
  readonly claimIds?: readonly string[];
  readonly sourceIds?: readonly string[];
  readonly datasetIds?: readonly string[];
  readonly rejectedClaimIds?: readonly string[];
  readonly resolvedIssueClaimIds?: readonly string[];
}

interface SourceMapReviewLookup {
  readonly claims: ReadonlyMap<string, Claim>;
  readonly sources: ReadonlyMap<string, Source>;
  readonly datasets: ReadonlyMap<string, ResearchDataset>;
}

export function createSlideSourceMapReview(
  input: CreateSlideSourceMapReviewInput,
): SlideSourceMapReview {
  const lookup = createLookup(input.research);
  const slides = input.map.entries.map((entry) =>
    createSlideReviewEntry(entry, lookup, issuesForSlide(input.map.issues, entry.slideId)),
  );

  return Object.freeze({
    slides: Object.freeze(slides),
    issueCount: input.map.issues.length,
    fatalIssueCount: input.map.fatalIssues.length,
    imageGenerationGate: createImageGenerationSourceMapGate(input.map),
  });
}

export function createImageGenerationSourceMapGate(
  map: MinimalSlideSourceMap,
): ImageGenerationSourceMapGate {
  if (map.fatalIssues.length === 0) {
    return Object.freeze({
      status: "ready",
      blockedSlideIds: Object.freeze([]),
      reasons: Object.freeze([]),
    });
  }

  return Object.freeze({
    status: "blocked",
    blockedSlideIds: Object.freeze(unique(map.fatalIssues.map((issue) => issue.slideId))),
    reasons: Object.freeze(map.fatalIssues.map((issue) => issue.message)),
  });
}

export function applySourceMapCorrection(
  map: MinimalSlideSourceMap,
  correction: SlideSourceMapCorrection,
): MinimalSlideSourceMap {
  const entries = map.entries.map((entry) =>
    entry.slideId === correction.slideId ? applyEntryCorrection(entry, correction) : entry,
  );
  const issues = map.issues.filter((issue) => !isResolvedIssue(issue, correction));
  const fatalIssues = issues.filter((issue) => issue.severity === "fatal");

  return Object.freeze({
    entries: Object.freeze(entries),
    issues: Object.freeze(issues),
    fatalIssues: Object.freeze(fatalIssues),
  });
}

function createSlideReviewEntry(
  entry: SlideSourceMapEntry,
  lookup: SourceMapReviewLookup,
  issues: readonly SlideSourceMapIssue[],
): SlideSourceMapReviewEntry {
  const issueMessages = issues.map((issue) => issue.message);
  const rejectedClaims = entry.rejectedClaimIds.map((id) => claimReference(id, lookup));
  return Object.freeze({
    slideId: entry.slideId,
    slideNumber: entry.slideNumber,
    status: statusForEntry(entry, issues),
    claims: Object.freeze(entry.claimIds.map((id) => claimReference(id, lookup))),
    sources: Object.freeze(entry.sourceIds.map((id) => sourceReference(id, lookup))),
    datasets: Object.freeze(entry.datasetIds.map((id) => datasetReference(id, lookup))),
    rejectedClaims: Object.freeze(rejectedClaims),
    issueMessages: Object.freeze(issueMessages),
  });
}

function statusForEntry(
  entry: SlideSourceMapEntry,
  issues: readonly SlideSourceMapIssue[],
): SourceMapReviewSlideStatus {
  if (issues.some((issue) => issue.severity === "fatal") || entry.rejectedClaimIds.length > 0) {
    return "blocked";
  }
  if (entry.claimIds.length > 0 || entry.sourceIds.length > 0 || entry.datasetIds.length > 0) {
    return "ready";
  }
  return "empty";
}

function applyEntryCorrection(
  entry: SlideSourceMapEntry,
  correction: SlideSourceMapCorrection,
): SlideSourceMapEntry {
  return Object.freeze({
    slideId: entry.slideId,
    slideNumber: entry.slideNumber,
    claimIds: Object.freeze([...(correction.claimIds ?? entry.claimIds)]),
    sourceIds: Object.freeze([...(correction.sourceIds ?? entry.sourceIds)]),
    datasetIds: Object.freeze([...(correction.datasetIds ?? entry.datasetIds)]),
    rejectedClaimIds: Object.freeze([...(correction.rejectedClaimIds ?? entry.rejectedClaimIds)]),
  });
}

function isResolvedIssue(
  issue: SlideSourceMapIssue,
  correction: SlideSourceMapCorrection,
): boolean {
  if (issue.slideId !== correction.slideId) return false;
  if (!issue.claimId) return false;
  return (correction.resolvedIssueClaimIds ?? []).includes(issue.claimId);
}

function issuesForSlide(
  issues: readonly SlideSourceMapIssue[],
  slideId: string,
): readonly SlideSourceMapIssue[] {
  return issues.filter((issue) => issue.slideId === slideId);
}

function createLookup(research: ResearchPack): SourceMapReviewLookup {
  return {
    claims: new Map(research.claims.map((claim) => [claim.id, claim])),
    sources: new Map(research.sources.map((source) => [source.id, source])),
    datasets: new Map(research.datasets.map((dataset) => [dataset.id, dataset])),
  };
}

function claimReference(id: string, lookup: SourceMapReviewLookup): SourceMapReviewReference {
  return { kind: "claim", id, label: lookup.claims.get(id)?.statement ?? id };
}

function sourceReference(id: string, lookup: SourceMapReviewLookup): SourceMapReviewReference {
  return { kind: "source", id, label: lookup.sources.get(id)?.title ?? id };
}

function datasetReference(id: string, lookup: SourceMapReviewLookup): SourceMapReviewReference {
  return { kind: "dataset", id, label: lookup.datasets.get(id)?.title ?? id };
}

function unique(values: readonly string[]): readonly string[] {
  const out: string[] = [];
  values.forEach((value) => {
    if (!out.includes(value)) out.push(value);
  });
  return out;
}
