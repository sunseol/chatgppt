import { CheckCircle2 } from "lucide-react";
import type { ReviewGalleryItem } from "@/components/deck/review-gallery-model";

export function ReviewSlideIdentity({ item }: { readonly item: ReviewGalleryItem | undefined }) {
  if (!item) return null;
  const artifact = item.composition?.backgroundArtifact;
  const approved = item.slide.status === "approved";
  return (
    <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
      <div
        className={`border px-2 py-1.5 ${
          approved ? "border-success/40 bg-success/10" : "border-border bg-background"
        }`}
      >
        <div className="uppercase tracking-wider text-muted-foreground">승인 상태</div>
        <div className="mt-1 flex items-center gap-1.5 font-medium">
          {approved ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : null}
          {approved ? "승인 완료" : "검토 대기"}
        </div>
      </div>
      {artifact ? (
        <div className="min-w-0 border border-border bg-background px-2 py-1.5">
          <div className="uppercase tracking-wider text-muted-foreground">생성 이미지 identity</div>
          <div
            className="mt-1 truncate font-mono font-medium"
            title={`${artifact.artifactId} ${artifact.hash}`}
          >
            {artifact.artifactId}
          </div>
          <div className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">
            {artifact.hash}
          </div>
        </div>
      ) : null}
    </div>
  );
}
