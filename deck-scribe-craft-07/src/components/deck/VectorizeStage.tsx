import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EditableReviewGatePanel } from "@/components/deck/EditableReviewGatePanel";
import { GateBar } from "@/components/deck/GateBar";
import { SlidePreview } from "@/components/deck/SlidePreview";
import { EmptyAction, StageHeader } from "@/components/deck/stage-shared";
import { fakeAsync } from "@/components/deck/stage-timing";
import { approveStage, updateProject } from "@/lib/deck-store";
import type { DeckProject, EditableLayerModel } from "@/lib/deck-types";
import {
  evaluateEditableReviewGate,
  type EditableReviewGateReport,
} from "@/lib/editable-review-gate";
import { hash, mockLayers } from "@/lib/mock-ai";

export function VectorizeStage({ project }: { readonly project: DeckProject }) {
  const navigate = useNavigate();
  const [layers, setLayers] = useState<EditableLayerModel[] | undefined>(project.layers);
  const [busy, setBusy] = useState(false);

  useEffect(() => setLayers(project.layers), [project.layers]);

  const convert = async () => {
    if (!project.plan || !project.design) return;
    setBusy(true);
    await fakeAsync(null, 1100);
    const nextLayers = mockLayers(project.plan, project.design);
    setLayers(nextLayers);
    updateProject(project.id, { layers: nextLayers, stage: "EDITABLE_REVIEW_PENDING" });
    setBusy(false);
  };

  const approve = () => {
    if (!layers || !report.canApprove) return;
    approveStage(project.id, "vectorize", "EDITOR", hash(JSON.stringify(layers)));
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "editor" },
    });
  };

  const report = useMemo(() => evaluateEditableReviewGate(layers ?? []), [layers]);

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-8 py-12">
        <StageHeader num="08" sub="Vectorize · PNG → Editable Layers" title="편집 가능 변환" />
        {!layers ? (
          <EmptyAction
            label="DOM layer metadata + Slide Spec 기반으로 편집 가능한 레이어 모델 생성"
            busy={busy}
            onClick={convert}
          />
        ) : (
          <VectorizeReview project={project} layers={layers} report={report} />
        )}
      </div>
      <GateBar
        hint={layers ? "편집 가능성 검증을 통과해야 편집기로 이동할 수 있습니다." : ""}
        regenerate={layers ? { label: "재변환", onClick: convert } : undefined}
        approve={
          layers
            ? {
                label: "변환 결과를 승인하고 편집기 열기",
                onClick: approve,
                disabled: !report.canApprove,
              }
            : undefined
        }
      />
    </div>
  );
}

function VectorizeReview({
  project,
  layers,
  report,
}: {
  readonly project: DeckProject;
  readonly layers: readonly EditableLayerModel[];
  readonly report: EditableReviewGateReport;
}) {
  return (
    <>
      <EditableReviewGatePanel report={report} />
      <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
        {layers.map((model) => (
          <VectorizeSlideCard key={model.slideNumber} project={project} model={model} />
        ))}
      </div>
    </>
  );
}

function VectorizeSlideCard({
  project,
  model,
}: {
  readonly project: DeckProject;
  readonly model: EditableLayerModel;
}) {
  const spec = project.plan?.slides.find((slide) => slide.number === model.slideNumber);
  if (!spec || !project.design) return null;
  return (
    <div className="border border-border bg-paper">
      <div className="aspect-video w-full bg-background">
        <SlidePreview
          design={project.design}
          spec={spec}
          slide={{
            number: model.slideNumber,
            version: 1,
            status: "approved",
            imageDescriptor: "",
          }}
          mode="layers"
        />
      </div>
      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        #{String(model.slideNumber).padStart(2, "0")} · {model.layers.length} layers
      </div>
    </div>
  );
}
