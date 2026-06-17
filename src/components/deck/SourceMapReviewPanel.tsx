import { AlertTriangle, Link2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  SlideSourceMapReview,
  SlideSourceMapReviewEntry,
  SourceMapReviewReference,
} from "@/lib/source-map-review";

export function SourceMapReviewPanel({
  review,
  correctionText,
  disabled,
  onCorrectionTextChange,
  onApplyCorrection,
}: {
  readonly review: SlideSourceMapReview;
  readonly correctionText: string;
  readonly disabled: boolean;
  readonly onCorrectionTextChange: (value: string) => void;
  readonly onApplyCorrection: () => void;
}) {
  const blocked = review.imageGenerationGate.status === "blocked";
  return (
    <section className="border border-border bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-accent" />
            슬라이드별 근거 맵
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {review.slides.length} slides · {review.issueCount} issues
          </p>
        </div>
        <Badge variant={blocked ? "destructive" : "secondary"}>
          {blocked ? "이미지 생성 차단" : "생성 가능"}
        </Badge>
      </div>

      {blocked && (
        <div className="mt-4 border border-destructive/30 bg-destructive/10 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            이미지 생성 차단
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {review.imageGenerationGate.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {review.slides.map((slide) => (
          <SourceMapSlideRow key={slide.slideId} slide={slide} />
        ))}
      </ul>

      <div className="mt-4 border-t border-border pt-4">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Source Map 보정 요청
        </Label>
        <Textarea
          value={correctionText}
          disabled={disabled}
          onChange={(event) => onCorrectionTextChange(event.target.value)}
          rows={4}
          placeholder="예: slide_03의 claim_002에 src_002와 dataset_002를 연결"
          className="mt-2 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !correctionText.trim()}
          onClick={onApplyCorrection}
          className="mt-3 w-full"
        >
          보정 요청 반영
        </Button>
      </div>
    </section>
  );
}

function SourceMapSlideRow({ slide }: { readonly slide: SlideSourceMapReviewEntry }) {
  return (
    <li className="border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-xs text-muted-foreground">{slide.slideId}</div>
        <Badge variant={slide.status === "blocked" ? "destructive" : "outline"}>
          {slide.status}
        </Badge>
      </div>
      <div className="mt-3 space-y-2 text-xs">
        <ReferenceGroup label="claim" references={slide.claims} />
        <ReferenceGroup label="source" references={slide.sources} />
        <ReferenceGroup label="dataset" references={slide.datasets} />
        {slide.rejectedClaims.length > 0 && (
          <ReferenceGroup label="rejected" references={slide.rejectedClaims} warning />
        )}
      </div>
      {slide.issueMessages.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-destructive">
          {slide.issueMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ReferenceGroup({
  label,
  references,
  warning,
}: {
  readonly label: string;
  readonly references: readonly SourceMapReviewReference[];
  readonly warning?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-muted-foreground">
        {warning && <AlertTriangle className="h-3 w-3 text-destructive" />}
        {!warning && <ShieldCheck className="h-3 w-3" />}
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {references.length === 0 ? (
          <span className="text-muted-foreground">none</span>
        ) : (
          references.map((reference) => (
            <Badge
              key={`${reference.kind}:${reference.id}`}
              variant="outline"
              title={reference.label}
              className={warning ? "border-destructive text-destructive" : ""}
            >
              {reference.id}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}
