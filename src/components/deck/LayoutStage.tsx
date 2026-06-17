import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ActionableErrorPanel } from "@/components/deck/ActionableErrorPanel";
import { Button } from "@/components/ui/button";
import { GateBar } from "@/components/deck/GateBar";
import { SlidePreview } from "@/components/deck/SlidePreview";
import { LayoutValidationPanel } from "@/components/deck/LayoutValidationPanel";
import { EmptyAction, InvalidatedBanner, StageHeader } from "@/components/deck/stage-shared";
import { approveStage, invalidateDownstream, updateProject } from "@/lib/deck-store";
import { canGenerateLayoutPrototype } from "@/lib/workflow-engine";
import { hash, mockLayout } from "@/lib/mock-ai";
import { createLayoutRenderWorkflowError } from "@/components/deck/layout-stage-errors";
import {
  canApproveLayout,
  layoutThumbnailSource,
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
  const invalidated = !!project.invalidated.layout;
  const validation = lp?.validationReport;

  useEffect(() => {
    setLp(project.layout);
    setError(undefined);
    setRevisionSlides([]);
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
    setRevisionSlides((current) =>
      current.includes(slideNumber)
        ? current.filter((number) => number !== slideNumber)
        : [...current, slideNumber],
    );
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-8 py-12">
        <StageHeader num="05" sub="Layout · HTML Prototype" title="레이아웃 초안" />
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
          <EmptyAction
            label="제한된 컴포넌트로 HTML 레이아웃 + DOM layer metadata 생성"
            busy={busy}
            onClick={generate}
          />
        ) : (
          <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
            {lp.slides.map((slide) => {
              const spec = project.plan?.slides.find(
                (planSlide) => planSlide.number === slide.number,
              );
              if (!spec || !project.design) return null;
              const thumbnail = layoutThumbnailSource(slide);
              const requested = revisionSlides.includes(slide.number);
              return (
                <div key={slide.number} className="border border-border bg-paper">
                  <div className="aspect-video w-full bg-background">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={`Slide ${slide.number} layout thumbnail`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <SlidePreview
                        design={project.design}
                        spec={spec}
                        slide={{
                          number: slide.number,
                          version: 1,
                          status: "ready",
                          imageDescriptor: "",
                        }}
                        mode="layout"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs">
                    <span className="font-mono text-muted-foreground">
                      #{String(slide.number).padStart(2, "0")} · {slide.componentType}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        layers · {slide.domLayers.length}
                      </span>
                      <Button
                        type="button"
                        variant={requested ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleRevision(slide.number)}
                        className="h-7 px-2 text-[11px]"
                      >
                        {requested ? "수정 요청됨" : "수정 요청"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
    </div>
  );
}
