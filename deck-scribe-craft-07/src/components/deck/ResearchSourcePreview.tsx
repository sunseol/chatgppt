import { BarChart3, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Claim, Source } from "@/lib/deck-types";

export function SourceReviewList({
  sources,
  claims,
}: {
  readonly sources: readonly Source[];
  readonly claims: readonly Claim[];
}) {
  return (
    <section>
      <h2 className="mb-4 font-serif text-xl">출처 미리보기 ({sources.length})</h2>
      <ul className="space-y-3">
        {sources.map((source) => (
          <li
            key={source.id}
            className="grid gap-4 border border-border bg-paper p-4 lg:grid-cols-[156px_1fr]"
          >
            <SourceDocumentPreview source={source} claims={claims} />
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{source.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {source.publisher} · {source.year} · {source.sourceType}
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {source.id}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={source.grade === "A" ? "default" : "secondary"}
                    className={source.grade === "A" ? "bg-foreground text-background" : ""}
                  >
                    등급 {source.grade}
                  </Badge>
                  <Badge variant="outline">{sourcePolicyLabel(source.usePolicy)}</Badge>
                </div>
              </div>
              <SourceUsagePreview source={source} claims={claims} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourceDocumentPreview({
  source,
  claims,
}: {
  readonly source: Source;
  readonly claims: readonly Claim[];
}) {
  const linkedClaims = claims.filter((claim) => claim.sourceIds.includes(source.id));
  const bars = linkedClaims.length > 0 ? linkedClaims.slice(0, 4) : [undefined, undefined];
  return (
    <div className="min-h-[132px] border border-border bg-background p-3">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {source.sourceType}
        </span>
        <span>{source.grade}</span>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-1.5 w-4/5 bg-foreground/25" />
        <div className="h-1.5 w-full bg-foreground/15" />
        <div className="h-1.5 w-2/3 bg-foreground/15" />
      </div>
      <div className="mt-4 flex h-11 items-end gap-1 border-l border-b border-border pl-2">
        {bars.map((claim, index) => (
          <div
            key={claim?.id ?? index}
            className={claim?.hasNumber ? "w-5 bg-accent" : "w-5 bg-foreground/25"}
            style={{ height: `${42 + index * 12}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          연결 주장
        </span>
        <span>{linkedClaims.length}개</span>
      </div>
    </div>
  );
}

function SourceUsagePreview({
  source,
  claims,
}: {
  readonly source: Source;
  readonly claims: readonly Claim[];
}) {
  const linkedClaims = claims.filter((claim) => claim.sourceIds.includes(source.id));
  if (linkedClaims.length === 0) {
    return (
      <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        아직 연결된 주장이 없습니다. 필요하면 보강 요청에서 제외하거나 용도를 지정하세요.
      </div>
    );
  }
  const slideNumbers = Array.from(
    new Set(linkedClaims.flatMap((claim) => claim.slideCandidates)),
  ).sort((a, b) => a - b);
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">포함 이유</div>
      <p className="mt-1 line-clamp-2 text-sm">{linkedClaims[0]?.statement}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {linkedClaims.map((claim) => (
          <Badge key={claim.id} variant="outline">
            {claim.id}
          </Badge>
        ))}
        {slideNumbers.length > 0 ? (
          <Badge variant="secondary">슬라이드 {slideNumbers.join(", ")}</Badge>
        ) : null}
      </div>
    </div>
  );
}

function sourcePolicyLabel(policy: Source["usePolicy"]): string {
  switch (policy) {
    case "priority":
      return "우선 사용";
    case "allowed":
      return "사용 가능";
    case "supporting":
      return "보조 자료";
    case "restricted":
      return "주의 필요";
    default:
      return assertNever(policy);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected source policy: ${String(value)}`);
}
