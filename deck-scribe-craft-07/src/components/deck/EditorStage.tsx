import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EditorCanvasPanel } from "@/components/deck/EditorCanvasPanel";
import {
  EditorCanvasDialog,
  EditorConversionPanel,
  EditorStats,
  LargeEditButton,
  LayerList,
  SlideList,
} from "@/components/deck/EditorStagePanels";
import { EditorTextInspector } from "@/components/deck/EditorTextInspector";
import { GateBar } from "@/components/deck/GateBar";
import { StageHeader, StageScroll, StageShell } from "@/components/deck/stage-shared";
import { fakeAsync } from "@/components/deck/stage-timing";
import { useEditorAutosave } from "@/components/deck/useEditorAutosave";
import type { DeckProject, EditableLayerModel } from "@/lib/deck-types";
import {
  buildDeckEditorCanvasModels,
  buildEditorCanvasModel,
  estimateDeckOpenPerformance,
} from "@/lib/editor-canvas-model";
import { applyUpdatedTransform } from "@/lib/editor-stage-model";
import {
  moveDeckLayer,
  resizeDeckLayer,
  type EditorTransformResult,
} from "@/lib/editor-object-transform";
import { applyDeckLayerTextEdit, serializeEditorLayersForExport } from "@/lib/editor-text-edit";
import { updateProject } from "@/lib/deck-store";
import { mockLayers } from "@/lib/mock-ai";

export function EditorStage({ project }: { readonly project: DeckProject }) {
  const navigate = useNavigate();
  const [layers, setLayers] = useState<EditableLayerModel[]>(project.layers ?? []);
  const [selected, setSelected] = useState(layers[0]?.slideNumber ?? 1);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [conversionBusy, setConversionBusy] = useState(false);
  const [largeEditOpen, setLargeEditOpen] = useState(false);

  useEffect(() => {
    const nextLayers = project.layers ?? [];
    setLayers(nextLayers);
    setSelected((current) =>
      nextLayers.some((model) => model.slideNumber === current)
        ? current
        : (nextLayers[0]?.slideNumber ?? 1),
    );
    setSelectedLayerId(null);
  }, [project.layers]);

  useEffect(() => {
    if (layers.length > 0 || conversionBusy || !project.plan || !project.design) return;
    let cancelled = false;
    setConversionBusy(true);
    void fakeAsync(null, 1100).then(() => {
      if (cancelled || !project.plan || !project.design) return;
      const nextLayers = mockLayers(project.plan, project.design);
      setLayers(nextLayers);
      updateProject(project.id, { layers: nextLayers, stage: "EDITOR" });
      setConversionBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [conversionBusy, layers.length, project.design, project.id, project.plan]);

  const current = layers.find((model) => model.slideNumber === selected);
  const selectedLayer = current?.layers.find((layer) => layer.id === selectedLayerId);
  const canvasModel = useMemo(() => {
    if (!current || !project.design) return undefined;
    return buildEditorCanvasModel({
      canvas: { width: project.design.canvas.w, height: project.design.canvas.h },
      layerModel: current,
    });
  }, [current, project.design]);
  const performance = useMemo(() => {
    if (!project.design) return undefined;
    const models = buildDeckEditorCanvasModels({
      canvas: { width: project.design.canvas.w, height: project.design.canvas.h },
      layerModels: layers,
    });
    return estimateDeckOpenPerformance(models);
  }, [layers, project.design]);
  const exportPayload = useMemo(() => serializeEditorLayersForExport(layers), [layers]);
  const autosave = useEditorAutosave({
    projectId: project.id,
    projectUpdatedAt: project.updatedAt,
    layers,
    onRecover: (recoveredLayers) => {
      setLayers(recoveredLayers);
      updateProject(project.id, { layers: recoveredLayers });
    },
  });

  const persistLayers = (nextLayers: EditableLayerModel[]) => {
    autosave.saveSnapshot(nextLayers, "edit");
    setLayers(nextLayers);
    updateProject(project.id, { layers: nextLayers });
  };

  const updateLayerText = (layerId: string, text: string) => {
    const result = applyDeckLayerTextEdit(layers, { slideNumber: selected, layerId, text });
    if (result.kind !== "updated") return;
    persistLayers([...result.models]);
  };

  const applyTransform = (result: EditorTransformResult) => {
    applyUpdatedTransform(result, persistLayers);
  };

  const moveLayer = (layerId: string, delta: { readonly x: number; readonly y: number }) => {
    if (!project.design) return;
    applyTransform(
      moveDeckLayer(layers, {
        slideNumber: selected,
        layerId,
        delta,
        canvas: { width: project.design.canvas.w, height: project.design.canvas.h },
        safeMargin: project.design.canvas.safeMargin,
      }),
    );
  };

  const resizeLayer = (layerId: string, delta: { readonly w: number; readonly h: number }) => {
    if (!project.design) return;
    applyTransform(
      resizeDeckLayer(layers, {
        slideNumber: selected,
        layerId,
        delta,
        canvas: { width: project.design.canvas.w, height: project.design.canvas.h },
        safeMargin: project.design.canvas.safeMargin,
        minSize: { w: 48, h: 32 },
      }),
    );
  };

  const finalize = () => {
    updateProject(project.id, { stage: "FINAL_REPORTING" });
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "export" },
    });
  };

  return (
    <StageShell>
      <StageScroll className="max-w-none px-6">
        <StageHeader num="09" sub="Editor · Canvas" title="편집기" />
        {layers.length === 0 ? (
          <EditorConversionPanel />
        ) : (
          <div className="grid min-h-[calc(100vh-190px)] grid-cols-[120px_minmax(0,1fr)_300px] gap-5">
            <SlideList
              layers={layers}
              selected={selected}
              onSelect={(slideNumber) => {
                setSelected(slideNumber);
                setSelectedLayerId(null);
              }}
            />
            <div className="min-h-0 border border-border bg-paper">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  {String(selected).padStart(2, "0")}번 슬라이드 편집
                </div>
                <LargeEditButton onClick={() => setLargeEditOpen(true)} />
              </div>
              {canvasModel ? (
                <EditorCanvasPanel
                  model={canvasModel}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={setSelectedLayerId}
                  onMoveLayer={moveLayer}
                  onResizeLayer={resizeLayer}
                />
              ) : (
                <div className="grid aspect-video place-items-center text-sm text-muted-foreground">
                  편집 가능한 레이어가 없습니다.
                </div>
              )}
            </div>
            <aside>
              <EditorStats
                layerCount={exportPayload.layerCount}
                textLayerCount={exportPayload.textLayerCount}
                performancePassed={performance?.passed ?? false}
              />
              <LayerList
                current={current}
                selectedLayerId={selectedLayerId}
                onSelectLayer={setSelectedLayerId}
              />
              <EditorTextInspector
                layer={selectedLayer}
                exportHash={exportPayload.hash}
                onTextChange={updateLayerText}
              />
            </aside>
          </div>
        )}
      </StageScroll>
      {layers.length > 0 ? (
        <GateBar
          hint="편집을 마치면 최종 보고서를 생성합니다."
          approve={{ label: "최종화하고 내보내기로 이동", onClick: finalize }}
        />
      ) : null}
      <EditorCanvasDialog
        open={largeEditOpen}
        model={canvasModel}
        selectedLayerId={selectedLayerId}
        onOpenChange={setLargeEditOpen}
        onSelectLayer={setSelectedLayerId}
        onMoveLayer={moveLayer}
        onResizeLayer={resizeLayer}
      />
    </StageShell>
  );
}
