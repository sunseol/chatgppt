import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Maximize2 } from "lucide-react";
import { GateBar } from "@/components/deck/GateBar";
import { ReviewRequestPanel } from "@/components/deck/ReviewRequestPanel";
import { RevisionComparePanel } from "@/components/deck/RevisionComparePanel";
import { ReviewSlideList } from "@/components/deck/ReviewSlideList";
import { SlidePreview } from "@/components/deck/SlidePreview";
import { SlidePreviewDialog } from "@/components/deck/SlidePreviewDialog";
import {
  approveSelectedReviewSlide,
  runReviewStageSlideRegeneration,
  type ReviewStageRegenerationLocalFallback,
} from "@/components/deck/review-stage-regeneration";
import { approveReviewStageRevisionWithEvidence } from "@/components/deck/review-stage-regeneration-evidence";
import { StageHeader, StageScroll, StageShell } from "@/components/deck/stage-shared";
import { Button } from "@/components/ui/button";
import { approveStage, updateProject } from "@/lib/deck-store";
import { hash } from "@/lib/mock-ai";
import type { DeckProject, GeneratedSlide } from "@/lib/deck-types";
import type { LiveSlideRegenerationCandidate } from "@/lib/live-slide-regeneration";
import { createReviewEvidenceProjectPatch } from "@/lib/live-slide-regeneration-review-state";
import type { SlideRevisionComparison } from "@/lib/slide-revision-generation";

export function ReviewStage({
  project,
  localFallback = "enabled",
  headerNumber = "07",
}: {
  readonly project: DeckProject;
  readonly localFallback?: ReviewStageRegenerationLocalFallback;
  readonly headerNumber?: string;
}) {
  const navigate = useNavigate();
  const pendingReview = project.pendingLiveSlideRegenerationReview ?? null;
  const [slides, setSlides] = useState<GeneratedSlide[]>(project.slides ?? []);
  const [selected, setSelected] = useState<number | null>(slides[0]?.number ?? null);
  const [edit, setEdit] = useState("");
  const [busy, setBusy] = useState(false);
  const [largeOpen, setLargeOpen] = useState(false);
  const [revisionComparison, setRevisionComparison] = useState<SlideRevisionComparison | null>(
    pendingReview?.comparison ?? null,
  );
  const [liveRegenerationCandidate, setLiveRegenerationCandidate] =
    useState<LiveSlideRegenerationCandidate | null>(pendingReview?.liveCandidate ?? null);

  useEffect(() => {
    const nextPendingReview = project.pendingLiveSlideRegenerationReview ?? null;
    setSlides(project.slides ?? []);
    setRevisionComparison(nextPendingReview?.comparison ?? null);
    setLiveRegenerationCandidate(nextPendingReview?.liveCandidate ?? null);
  }, [project.pendingLiveSlideRegenerationReview, project.slides]);

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
        localFallback,
      });
      setSlides([...result.slides]);
      updateProject(project.id, (current) => ({
        ...createReviewEvidenceProjectPatch({
          project: current,
          slides: result.slides,
          reviewEvidencePath: result.reviewEvidencePath,
          slideNumber: selected,
          outcome: "preserved_after_failure",
        }),
        pendingLiveSlideRegenerationReview:
          result.comparison && result.liveCandidate
            ? { comparison: result.comparison, liveCandidate: result.liveCandidate }
            : null,
      }));
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
    updateProject(project.id, (current) => ({
      ...createReviewEvidenceProjectPatch({
        project: current,
        slides: result.slides,
        reviewEvidencePath: result.reviewEvidencePath,
        slideNumber: revisionComparison.slideNumber,
        outcome: result.reviewOutcome ?? "approved",
      }),
      pendingLiveSlideRegenerationReview: null,
    }));
    setRevisionComparison(null);
    setLiveRegenerationCandidate(null);
  };

  const requestRevisionAgain = () => {
    if (!revisionComparison) return;
    setEdit(revisionComparison.requestedChanges.join(" "));
    setRevisionComparison(null);
    setLiveRegenerationCandidate(null);
    updateProject(project.id, { pendingLiveSlideRegenerationReview: null });
  };

  const approveSelectedOriginal = () => {
    if (selected == null) return;
    const approved = approveSelectedReviewSlide(slides, selected);
    setSlides([...approved]);
    updateProject(project.id, { slides: [...approved], pendingLiveSlideRegenerationReview: null });
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
        <StageHeader num={headerNumber} sub="Review" title="슬라이드 검토" />
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
