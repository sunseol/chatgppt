import type { ResearchSourceType, Source } from "./research-types";

export type CitationAudience = "slide" | "report" | "source_map";

export type CitationRenderOptions = {
  readonly uncertain?: boolean;
};

export type BatchCitationRenderInput = {
  readonly sourceIds: readonly string[];
  readonly sources: readonly Source[];
  readonly audience: CitationAudience;
  readonly uncertainSourceIds?: readonly string[];
};

export type BatchCitationRenderResult = {
  readonly citations: readonly string[];
  readonly missingSourceIds: readonly string[];
};

export function formatSlideCitation(source: Source, options: CitationRenderOptions = {}): string {
  return appendReviewMarker(`${source.publisher} (${source.year})`, source, options);
}

export function formatReportCitation(source: Source, options: CitationRenderOptions = {}): string {
  const url = source.url === undefined ? "" : ` ${source.url}`;
  return appendReviewMarker(
    `[${source.grade}/${source.sourceType}] ${formatDetailedSource(source)}${url}`,
    source,
    options,
  );
}

export function formatSourceMapCitation(
  source: Source,
  options: CitationRenderOptions = {},
): string {
  return appendReviewMarker(
    `${source.id}: ${source.publisher} (${source.year}) · ${source.sourceType} · grade ${source.grade}`,
    source,
    options,
  );
}

export function formatCitationsForSourceIds(
  input: BatchCitationRenderInput,
): BatchCitationRenderResult {
  const sources = new Map(input.sources.map((source) => [source.id, source]));
  const uncertainSourceIds = new Set(input.uncertainSourceIds ?? []);
  const citations: string[] = [];
  const missingSourceIds: string[] = [];

  input.sourceIds.forEach((sourceId) => {
    const source = sources.get(sourceId);
    if (source === undefined) {
      missingSourceIds.push(sourceId);
      return;
    }
    citations.push(
      formatCitationForAudience(source, input.audience, {
        uncertain: uncertainSourceIds.has(sourceId),
      }),
    );
  });

  return {
    citations,
    missingSourceIds,
  };
}

function formatCitationForAudience(
  source: Source,
  audience: CitationAudience,
  options: CitationRenderOptions,
): string {
  switch (audience) {
    case "slide":
      return formatSlideCitation(source, options);
    case "report":
      return formatReportCitation(source, options);
    case "source_map":
      return formatSourceMapCitation(source, options);
    default:
      return assertNever(audience);
  }
}

function formatDetailedSource(source: Source): string {
  switch (source.sourceType) {
    case "government":
    case "international":
    case "media":
      return `${source.publisher}. ${source.title}. ${source.year}.`;
    case "research":
    case "academic":
      return `${source.publisher} (${source.year}). ${source.title}.`;
    case "company":
    case "industry":
      return `${source.publisher}, ${source.title} (${source.year}).`;
    case "original_data":
    case "user_material":
      return `${source.title}. ${source.publisher}, ${source.year}.`;
    default:
      return assertNeverSourceType(source.sourceType);
  }
}

function appendReviewMarker(
  citation: string,
  source: Source,
  options: CitationRenderOptions,
): string {
  return requiresReviewMarker(source, options) ? `${citation} · 검토 필요` : citation;
}

function requiresReviewMarker(source: Source, options: CitationRenderOptions): boolean {
  return (
    options.uncertain === true ||
    source.grade === "C" ||
    source.grade === "D" ||
    source.usePolicy === "restricted"
  );
}

function assertNever(value: never): never {
  throw new Error(`Unexpected citation audience: ${String(value)}`);
}

function assertNeverSourceType(value: never): never {
  throw new Error(`Unexpected citation source type: ${String(value)}`);
}
