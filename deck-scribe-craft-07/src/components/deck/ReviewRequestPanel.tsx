import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedSlide } from "@/lib/deck-types";

export function ReviewRequestPanel({
  edit,
  busy,
  slide,
  onEdit,
  onRegenerate,
  onApproveOriginal,
}: {
  readonly edit: string;
  readonly busy: boolean;
  readonly slide: GeneratedSlide | undefined;
  readonly onEdit: (value: string) => void;
  readonly onRegenerate: () => void;
  readonly onApproveOriginal: () => void;
}) {
  return (
    <aside className="space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">수정 지시</div>
        <Textarea
          value={edit}
          onChange={(event) => onEdit(event.target.value)}
          rows={6}
          placeholder="예: 오른쪽 그래프를 더 크게, 하단 출처 캡션은 유지"
          className="mt-2"
        />
      </div>
      <div className="border border-border bg-paper p-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          유지할 요소
        </div>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>제목 텍스트</li>
          <li>주요 수치</li>
          <li>출처 캡션</li>
          <li>승인한 색상</li>
        </ul>
      </div>
      {slide?.status !== "approved" ? (
        <Button
          onClick={onApproveOriginal}
          disabled={slide === undefined || busy}
          className="w-full"
        >
          <Check className="h-4 w-4" />
          선택 원본 승인
        </Button>
      ) : null}
      <Button
        onClick={onRegenerate}
        disabled={!edit.trim() || busy}
        variant="outline"
        className="w-full"
      >
        {busy ? "수정 생성 중..." : "이 슬라이드만 수정 생성"}
      </Button>
    </aside>
  );
}
