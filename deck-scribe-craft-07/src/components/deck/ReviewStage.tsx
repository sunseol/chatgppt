import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Maximize2 } from "lucide-react";
import { GateBar } from "@/components/deck/GateBar";
import { RevisionComparePanel } from "@/components/deck/RevisionComparePanel";
import { ReviewSlideList } from "@/components/deck/ReviewSlideList";
import { SlidePreview } from "@/components/deck/SlidePreview";
import { SlidePreviewDialog } from "@/components/deck/SlidePreviewDialog";
import {
  approveSelectedReviewSlide,
  runReviewStageSlideRegeneration,
} from "@/components/deck/review-stage-regeneration";
import { approveReviewStageRevisionWithEvidence } from "@/components/deck/review-stage-regeneration-evidence";
import { StageHeader, StageScroll, StageShell } from "@/components/deck/stage-shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveStage, updateProject } from "@/lib/deck-store";
import { hash } from "@/lib/mock-ai";
import type { DeckProject, GeneratedSlide } from "@/lib/deck-types";
import type { LiveSlideRegenerationCandidate } from "@/lib/live-slide-regeneration";
import { createReviewEvidenceProjectPatch } from "@/lib/live-slide-regeneration-review-state";
import type { SlideRevisionComparison } from "@/lib/slide-revision-generation";

export function ReviewStage({ project }: { readonly project: DeckProject }) {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<GeneratedSlide[]>(project.slides ?? []);
  const [selected, setSelected] = useState<number | null>(slides[0]?.number ?? null);
  const [edit, setEdit] = useState("");
  const [busy, setBusy] = useState(false);
  const [largeOpen, setLargeOpen] = useState(false);
  const [revisionComparison, setRevisionComparison] = useState<SlideRevisionComparison | null>(
    null,
  );
  const [liveRegenerationCandidate, setLiveRegenerationCandidate] =
    useState<LiveSlideRegenerationCandidate | null>(null);

  useEffect(() => {
    setSlides(project.slides ?? []);
    setRevisionComparison(null);
    setLiveRegenerationCandidate(null);
  }, [project.slides]);

  const regenSelected = async () => {
    const instruction = edit.trim();
    if (selected == null || !instruction) return;
    setBusy(true);
    try {
      const result = await runReviewStageSlideRegeneration({
        project,
        slides,
        selected,
        instruction,
      });
      setSlides([...result.slides]);
      updateProject(project.id, (current) =>
        createReviewEvidenceProjectPatch({
          project: current,
          slides: result.slides,
          reviewEvidencePath: result.reviewEvidencePath,
          slideNumber: selected,
          outcome: "preserved_after_failure",
        }),
      );
      setRevisionComparison(result.comparison);
      setLiveRegenerationCandidate(result.liveCandidate);
      if (result.editConsumed) setEdit("");
    } finally {
      setBusy(false);
    }
  };

  const approveRevision = async () => {
    if (!revisionComparison) return;
    const result = await approveReviewStageRevisionWithEvidence({
      projectId: project.id,
      slides,
      comparison: revisionComparison,
      liveCandidate: liveRegenerationCandidate,
    });
    setSlides([...result.slides]);
    updateProject(project.id, (current) =>
      createReviewEvidenceProjectPatch({
        project: current,
        slides: result.slides,
        reviewEvidencePath: result.reviewEvidencePath,
        slideNumber: revisionComparison.slideNumber,
        outcome: "approved",
      }),
    );
    setRevisionComparison(null);
    setLiveRegenerationCandidate(null);
  };

  const requestRevisionAgain = () => {
    if (!revisionComparison) return;
    setEdit(revisionComparison.requestedChanges.join(" "));
    setRevisionComparison(null);
    setLiveRegenerationCandidate(null);
  };

  const approveSelectedOriginal = () => {
    if (selected == null) return;
    const approved = approveSelectedReviewSlide(slides, selected);
    setSlides([...approved]);
    updateProject(project.id, { slides: [...approved] });
    setRevisionComparison(null);
    setLiveRegenerationCandidate(null);
  };

  const approveAll = () => {
    const approved = slides.map((slide) => ({ ...slide, status: "approved" as const }));
    updateProject(project.id, { slides: approved, stage: "EDITOR" });
    approveStage(project.id, "review", "EDITOR", hash(JSON.stringify(approved)));
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "editor" },
    });
  };

  const spec = project.plan?.slides.find((slide) => slide.number === selected);
  const slide = slides.find((item) => item.number === selected);

  return (
    <StageShell>
      <StageScroll className="mx-auto max-w-7xl px-8">
        <StageHeader num="07" sub="Review" title="슬라이드 검토" />
        <div className="grid min-h-[520px] grid-cols-[220px_minmax(0,1fr)_300px] gap-5">
          <ReviewSlideList
            slides={slides}
            selected={selected}
            project={project}
            onSelect={setSelected}
          />
          <section className="border border-border bg-paper">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="text-xs text-muted-foreground">
                {selected ? `${String(selected).padStart(2, "0")}번 슬라이드` : "슬라이드"}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLargeOpen(true)}>
                <Maximize2 className="h-4 w-4" />
                크게 보기
              </Button>
            </div>
            <div className="aspect-video w-full bg-background">
              {spec && slide && project.design ? (
                <SlidePreview design={project.design} spec={spec} slide={slide} mode="image" />
              ) : null}
            </div>
          </section>
          <ReviewRequestPanel
            edit={edit}
            busy={busy}
            slide={slide}
            onEdit={setEdit}
            onRegenerate={regenSelected}
            onApproveOriginal={approveSelectedOriginal}
          />
        </div>
        {revisionComparison && revisionComparison.slideNumber === selected ? (
          <div className="mt-5">
            <RevisionComparePanel
              comparison={revisionComparison}
              onApproveRevision={approveRevision}
              onRequestRevision={requestRevisionAgain}
            />
          </div>
        ) : null}
      </StageScroll>
      <GateBar
        hint="검토를 마치면 편집기에서 바로 레이어 변환을 진행합니다."
        approve={{ label: "전체 슬라이드 승인하고 편집 시작", onClick: approveAll }}
      />
      <SlidePreviewDialog
        open={largeOpen}
        onOpenChange={setLargeOpen}
        title="슬라이드 크게 보기"
        description="선택한 슬라이드를 큰 화면으로 확인합니다."
        design={project.design}
        spec={spec}
        slide={slide}
      />
    </StageShell>
  );
}

function ReviewRequestPanel({
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
