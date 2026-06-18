import type { EvidenceExtractionResult, EvidenceItem } from "./evidence-extractor";
import type { LiveResearchEvidenceReference } from "./live-research-evidence";
import type { Claim, ResearchPack, Source } from "./research-types";

export type LiveResearchEvidenceRefBuildInput = {
  readonly pack: ResearchPack;
  readonly evidenceResults: readonly EvidenceExtractionResult[];
};

export function createLiveResearchEvidenceRefs(
  input: LiveResearchEvidenceRefBuildInput,
): readonly LiveResearchEvidenceReference[] {
  const sourcesById = new Map(input.pack.sources.map((source) => [source.id, source]));
  const evidenceBySourceId = new Map(
    input.evidenceResults.map((result) => [result.sourceId, result.items]),
  );
  return input.pack.claims.flatMap((claim) =>
    createClaimEvidenceRefs({ claim, sourcesById, evidenceBySourceId }),
  );
}

export function attachLiveResearchEvidenceRefs(
  input: LiveResearchEvidenceRefBuildInput,
): ResearchPack {
  return {
    ...input.pack,
    liveEvidenceRefs: [...createLiveResearchEvidenceRefs(input)],
  };
}

function createClaimEvidenceRefs(input: {
  readonly claim: Claim;
  readonly sourcesById: ReadonlyMap<string, Source>;
  readonly evidenceBySourceId: ReadonlyMap<string, readonly EvidenceItem[]>;
}): readonly LiveResearchEvidenceReference[] {
  return input.claim.sourceIds.flatMap((sourceId) => {
    const source = input.sourcesById.get(sourceId);
    const sourceArtifactPath = source?.capture?.rawArchivePath;
    if (!sourceArtifactPath) return [];

    const evidenceItem = findClaimEvidenceItem(
      input.claim,
      input.evidenceBySourceId.get(sourceId) ?? [],
    );
    if (!evidenceItem) return [];

    return toEvidenceRef({
      claim: input.claim,
      sourceId,
      sourceArtifactPath,
      evidenceItem,
    });
  });
}

function findClaimEvidenceItem(
  claim: Claim,
  evidenceItems: readonly EvidenceItem[],
): EvidenceItem | undefined {
  return evidenceItems.find(
    (item) =>
      (item.kind === "claim" || item.kind === "table") && item.statement === claim.statement,
  );
}

function toEvidenceRef(input: {
  readonly claim: Claim;
  readonly sourceId: string;
  readonly sourceArtifactPath: string;
  readonly evidenceItem: EvidenceItem;
}): readonly LiveResearchEvidenceReference[] {
  const datasetId = firstDatasetId(input.claim);
  if (input.evidenceItem.tableRef) {
    return [
      {
        id: evidenceRefId(input.claim.id, input.sourceId, "table"),
        claimId: input.claim.id,
        sourceId: input.sourceId,
        sourceArtifactPath: input.sourceArtifactPath,
        kind: "table_reference",
        tableRef: input.evidenceItem.tableRef,
        ...(datasetId === undefined ? {} : { datasetId }),
      },
    ];
  }
  if (input.evidenceItem.quoteSpan) {
    return [
      {
        id: evidenceRefId(input.claim.id, input.sourceId, "quote"),
        claimId: input.claim.id,
        sourceId: input.sourceId,
        sourceArtifactPath: input.sourceArtifactPath,
        kind: "quote_span",
        quoteSpan: input.evidenceItem.quoteSpan,
        ...(datasetId === undefined ? {} : { datasetId }),
      },
    ];
  }
  return [];
}

function firstDatasetId(claim: Claim): string | undefined {
  for (const datasetId of claim.datasetIds) {
    if (datasetId.trim()) return datasetId;
  }
  return undefined;
}

function evidenceRefId(claimId: string, sourceId: string, kind: "quote" | "table"): string {
  return `ev_${claimId}_${sourceId}_${kind}`;
}
