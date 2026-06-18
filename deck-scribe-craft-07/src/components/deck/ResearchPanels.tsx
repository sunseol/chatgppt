import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  Claim,
  FactCheckIssue,
  FactCheckReport,
  ResearchChart,
  ResearchDataset,
} from "@/lib/deck-types";

export function ClaimReviewList({ claims }: { readonly claims: readonly Claim[] }) {
  return (
    <section>
      <h2 className="mb-4 font-serif text-xl">핵심 주장 ({claims.length})</h2>
      <ul className="space-y-3">
        {claims.map((claim) => (
          <li key={claim.id} className="border border-border bg-paper p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm">{claim.statement}</div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant={claim.needsUserReview ? "outline" : "secondary"}>
                  {claim.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{claim.confidence}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <ReferenceBadges label="claim" values={[claim.id]} />
              <ReferenceBadges label="source" values={claim.sourceIds} />
              <ReferenceBadges label="dataset" values={claim.datasetIds} />
              {claim.needsUserReview && (
                <Badge variant="outline" className="border-warning text-warning">
                  사용자 확인 필요
                </Badge>
              )}
              {claim.sourceIds.length === 0 && (
                <Badge variant="outline" className="border-warning text-warning">
                  출처 없음 · 가설
                </Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DatasetReviewList({
  datasets,
  charts,
}: {
  readonly datasets: readonly ResearchDataset[];
  readonly charts: readonly ResearchChart[];
}) {
  return (
    <section className="border border-border bg-paper p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        데이터와 차트
      </div>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        {datasets.map((dataset) => (
          <div key={dataset.id} className="border border-border bg-background p-3">
            <div className="font-medium">{dataset.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {dataset.id} · {dataset.unit} · {dataset.period} · {dataset.geography}
            </div>
          </div>
        ))}
        {charts.map((chart) => (
          <div key={chart.id} className="border border-border bg-background p-3">
            <div className="font-medium">{chart.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {chart.id} · {chart.chartType} · {chart.datasetId}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FactCheckReview({ report }: { readonly report: FactCheckReport }) {
  return (
    <section className="border border-border bg-paper p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        조사 결과 확인
      </div>
      <p className="mt-2 text-sm">{report.summary}</p>
      <IssueList issues={report.issues} />
      {report.uncertainItems.length > 0 && (
        <div className="mt-4 border-l-2 border-warning bg-warning/10 p-3">
          <div className="text-[11px] uppercase tracking-wider text-warning">불확실 항목</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {report.uncertainItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function ReinforcementRequest({
  value,
  disabled,
  onChange,
  onApply,
}: {
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
  readonly onApply: () => void;
}) {
  return (
    <section className="border border-border bg-paper p-4">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        보강 요청
      </Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        disabled={disabled}
        placeholder="예: 시장 규모 수치는 정부 원자료 위주로 다시 확인"
        className="mt-2"
      />
      <Button
        onClick={onApply}
        disabled={disabled || !value.trim()}
        variant="outline"
        className="mt-3 w-full"
      >
        보강 요청 반영
      </Button>
    </section>
  );
}

function ReferenceBadges({
  label,
  values,
}: {
  readonly label: string;
  readonly values: readonly string[];
}) {
  return (
    <>
      {values.map((value) => (
        <Badge key={`${label}:${value}`} variant="outline">
          {value}
        </Badge>
      ))}
    </>
  );
}

function IssueList({ issues }: { readonly issues: readonly FactCheckIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2">
      {issues.map((issue) => (
        <li key={issue.id} className="border border-border bg-background p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span>{issue.message}</span>
            <Badge variant={issue.severity === "fatal" ? "destructive" : "outline"}>
              {issue.severity}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
