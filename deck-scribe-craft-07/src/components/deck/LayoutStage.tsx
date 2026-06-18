import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ActionableErrorPanel } from "@/components/deck/ActionableErrorPanel";
import { GateBar } from "@/components/deck/GateBar";
import { LayoutDraftWorkspace } from "@/components/deck/LayoutDraftWorkspace";
import { LayoutValidationPanel } from "@/components/deck/LayoutValidationPanel";
import {
  EmptyAction,
  InvalidatedBanner,
  StageHeader,
  StageScroll,
  StageShell,
} from "@/components/deck/stage-shared";
import { approveStage, invalidateDownstream, updateProject } from "@/lib/deck-store";
import { canGenerateLayoutPrototype } from "@/lib/workflow-engine";
import { hash, mockLayout } from "@/lib/mock-ai";
import { createLayoutRenderWorkflowError } from "@/components/deck/layout-stage-errors";
import {
  canApproveLayout,
  LAYOUT_APPROVAL_CTA_LABEL,
} from "@/components/deck/layout-approval-model";
import type { DeckProject, LayoutPrototype } from "@/lib/deck-types";
import type { WorkflowErrorRecord } from "@/lib/workflow-error-types";

async function fakeAsync<T>(value: T, ms = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function LayoutStage({ project }: { readonly project: DeckProject }) {
  const navigate = useNavigate();
  const [lp, setLp] = useState<LayoutPrototype | undefined>(project.layout);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<WorkflowErrorRecord | undefined>();
  const [revisionSlides, setRevisionSlides] = useState<readonly number[]>([]);
  const [revisionDraft, setRevisionDraft] = useState("");
  const [revisionRequests, setRevisionRequests] = useState<Record<number, string>>({});
  const [selectedSlide, setSelectedSlide] = useState(project.layout?.slides[0]?.number ?? 1);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [largeSlide, setLargeSlide] = useState<number | null>(null);
  const invalidated = !!project.invalidated.layout;
  const validation = lp?.validationReport;

  useEffect(() => {
    setLp(project.layout);
    setError(undefined);
    setRevisionSlides([]);
    setSelectedSlide(project.layout?.slides[0]?.number ?? 1);
    setSelectedLayerId(null);
  }, [project.layout]);

  const generate = async () => {
    if (!project.plan || !project.design || !canGenerateLayoutPrototype(project)) return;
    setBusy(true);
    setError(undefined);
    try {
      await fakeAsync(undefined, 1200);
      const layout = mockLayout(project.plan, project.design);
      updateProject(project.id, { layout, stage: "LAYOUT_APPROVAL_PENDING" });
      setLp(layout);
      invalidateDownstream(project.id, "layout");
    } catch (renderError) {
      setError(createLayoutRenderWorkflowError(renderError));
    } finally {
      setBusy(false);
    }
  };

  const approve = () => {
    if (!lp || !canApproveLayout(validation)) return;
    const approvedHash = hash(JSON.stringify(lp));
    updateProject(project.id, { layout: { ...lp, approvedHash } });
    approveStage(project.id, "layout", "GENERATING_SLIDES", approvedHash);
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "generate" },
    });
  };

  const backToDesign = () => {
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "design" },
    });
  };

  const toggleRevision = (slideNumber: number) => {
    setSelectedSlide(slideNumber);
    setRevisionSlides((current) =>
      current.includes(slideNumber)
        ? current.filter((number) => number !== slideNumber)
        : [...current, slideNumber],
    );
  };

  const applyRevisionRequest = () => {
    const request = revisionDraft.trim();
    if (!request) return;
    setRevisionRequests((current) => ({ ...current, [selectedSlide]: request }));
    setRevisionSlides((current) =>
      current.includes(selectedSlide) ? current : [...current, selectedSlide],
    );
    setRevisionDraft("");
  };

  const moveLayoutLayer = (
    slideNumber: number,
    layerId: string,
    delta: { readonly x: number; readonly y: number },
  ) => {
    const design = project.design;
    if (!design) return;
    setLp((current) => {
      if (!current) return current;
      const next = moveLayerInLayout(current, slideNumber, layerId, delta, design);
      updateProject(project.id, { layout: next, stage: "LAYOUT_APPROVAL_PENDING" });
      return next;
    });
  };

  return (
    <StageShell>
      <StageScroll className="mx-auto max-w-6xl px-8">
        <StageHeader num="05" sub="Layout" title="레이아웃 초안" />
        <InvalidatedBanner on={invalidated && !!lp} />
        {error ? <ActionableErrorPanel error={error} onRetry={generate} /> : null}
        {lp ? <LayoutValidationPanel report={validation} /> : null}
        <div className="mb-6 border-l-2 border-accent bg-paper p-4 text-sm">
          <strong className="font-medium">
            이 화면은 최종 디자인이 아니라 레이아웃 초안입니다.
          </strong>
          <span className="ml-2 text-muted-foreground">
            정보 배치, 텍스트 밀도, 시각화 영역, 슬라이드 흐름을 확인해주세요. 최종 시각 스타일은
            다음 이미지 생성 단계에서 개선됩니다.
          </span>
        </div>
        {!lp ? (
          <EmptyAction label="조정 가능한 레이아웃 초안 생성" busy={busy} onClick={generate} />
        ) : (
          <LayoutDraftWorkspace
            layout={lp}
            project={project}
            revisionSlides={revisionSlides}
            selectedSlide={selectedSlide}
            selectedLayerId={selectedLayerId}
            revisionDraft={revisionDraft}
            revisionRequests={revisionRequests}
            largeSlide={largeSlide}
            onSelectedSlide={setSelectedSlide}
            onSelectedLayer={setSelectedLayerId}
            onRevisionDraft={setRevisionDraft}
            onApplyRevision={applyRevisionRequest}
            onToggleRevision={toggleRevision}
            onLargeSlide={setLargeSlide}
            onMoveLayer={moveLayoutLayer}
          />
        )}
      </StageScroll>
      <GateBar
        hint={lp ? `${revisionSlides.length}건 수정 요청 · 검증 후 승인` : ""}
        back={lp ? { label: "디자인으로 돌아가기", onClick: backToDesign } : undefined}
        regenerate={lp ? { label: "전체 방향 다시 생성", onClick: generate } : undefined}
        approve={
          lp
            ? {
                label: LAYOUT_APPROVAL_CTA_LABEL,
                onClick: approve,
                disabled: !canApproveLayout(validation),
              }
            : undefined
        }
      />
    </StageShell>
  );
}

function moveLayerInLayout(
  layout: LayoutPrototype,
  slideNumber: number,
  layerId: string,
  delta: { readonly x: number; readonly y: number },
  design: NonNullable<DeckProject["design"]>,
): LayoutPrototype {
  return {
    ...layout,
    slides: layout.slides.map((slide) =>
      slide.number === slideNumber ? moveLayerInSlide(slide, layerId, delta, design) : slide,
    ),
  };
}

function moveLayerInSlide(
  slide: LayoutPrototype["slides"][number],
  layerId: string,
  delta: { readonly x: number; readonly y: number },
  design: NonNullable<DeckProject["design"]>,
): LayoutPrototype["slides"][number] {
  return {
    ...slide,
    domLayers: slide.domLayers.map((layer) =>
      layer.id === layerId
        ? {
            ...layer,
            bounds: {
              ...layer.bounds,
              x: clamp(layer.bounds.x + delta.x, 0, design.canvas.w - layer.bounds.w),
              y: clamp(layer.bounds.y + delta.y, 0, design.canvas.h - layer.bounds.h),
            },
          }
        : layer,
    ),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
