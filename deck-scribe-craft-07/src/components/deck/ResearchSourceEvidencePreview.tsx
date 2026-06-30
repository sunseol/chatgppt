import { Badge } from "@/components/ui/badge";
import type { Claim, Source } from "@/lib/deck-types";
import type { LiveResearchEvidenceReference } from "@/lib/live-research-evidence";

export interface SourceCaptureMetadata {
  readonly sourceId: string;
  readonly fetchedAt: string;
  readonly finalUrl?: string;
  readonly mimeType?: string;
  readonly statusCode?: number;
  readonly contentHash?: string;
}

export function LiveSourceEvidencePreview({
  source,
  claims,
  evidenceRefs,
  metadata,
}: {
  readonly source: Source;
  readonly claims: readonly Claim[];
  readonly evidenceRefs: readonly LiveResearchEvidenceReference[];
  readonly metadata: readonly SourceCaptureMetadata[];
}) {
  const persistedMetadata = source.capture
    ? {
        sourceId: source.id,
        fetchedAt: String(source.capture.fetchedAt),
        finalUrl: source.capture.finalUrl,
        mimeType: source.capture.mimeType,
        statusCode: source.capture.statusCode,
        contentHash: source.capture.contentHash,
      }
    : undefined;
  const sourceMetadata = metadata.find((item) => item.sourceId === source.id) ?? persistedMetadata;
  const fetchedAt = sourceMetadata?.fetchedAt;
  const sourceEvidence = evidenceRefs.filter((item) => item.sourceId === source.id);
  if (!sourceMetadata && sourceEvidence.length === 0) return null;
  return (
    <div className="mt-3 border-t border-border pt-3 text-xs">
      {fetchedAt ? (
        <div className="font-mono text-[11px] text-muted-foreground">fetched_at {fetchedAt}</div>
      ) : null}
      {sourceMetadata?.finalUrl ? (
        <div className="break-all font-mono text-[11px] text-muted-foreground">
          final_url {sourceMetadata.finalUrl}
        </div>
      ) : null}
      {sourceMetadata?.mimeType || sourceMetadata?.statusCode ? (
        <div className="font-mono text-[11px] text-muted-foreground">
          {sourceMetadata.mimeType ?? "unknown"} · {sourceMetadata.statusCode ?? "unknown"}
        </div>
      ) : null}
      {sourceMetadata?.contentHash ? (
        <div className="break-all font-mono text-[11px] text-muted-foreground">
          {sourceMetadata.contentHash}
        </div>
      ) : null}
      {sourceEvidence.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {sourceEvidence.map((evidenceRef) => {
            const claim = claims.find((item) => item.id === evidenceRef.claimId);
            return (
              <li key={evidenceRef.id} className="border border-border bg-background p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{evidenceRef.claimId}</Badge>
                  {claim ? <Badge variant="secondary">{claim.confidence}</Badge> : null}
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {evidenceSummary(evidenceRef)}
                  </span>
                </div>
                <div className="mt-1 text-muted-foreground">{evidenceText(evidenceRef)}</div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function evidenceSummary(evidenceRef: LiveResearchEvidenceReference): string {
  if (evidenceRef.kind === "quote_span") {
    return `quote ${evidenceRef.quoteSpan.start}-${evidenceRef.quoteSpan.end}`;
  }
  return `table ${evidenceRef.tableRef.tableId}`;
}

function evidenceText(evidenceRef: LiveResearchEvidenceReference): string {
  if (evidenceRef.kind === "quote_span") return evidenceRef.quoteSpan.text;
  return `${evidenceRef.tableRef.rowKey} / ${evidenceRef.tableRef.columnKey}`;
}
