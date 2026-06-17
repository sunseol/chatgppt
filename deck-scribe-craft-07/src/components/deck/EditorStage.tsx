import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EditorCanvasPanel } from "@/components/deck/EditorCanvasPanel";
import { EditorTextInspector } from "@/components/deck/EditorTextInspector";
import { GateBar } from "@/components/deck/GateBar";
import { StageHeader } from "@/components/deck/stage-shared";
import { useEditorAutosave } from "@/components/deck/useEditorAutosave";
import type { DeckProject, EditableLayerModel } from "@/lib/deck-types";
import {
  buildDeckEditorCanvasModels,
  buildEditorCanvasModel,
  estimateDeckOpenPerformance,
} from "@/lib/editor-canvas-model";
import {
  moveDeckLayer,
  resizeDeckLayer,
  type EditorTransformResult,
} from "@/lib/editor-object-transform";
import { applyDeckLayerTextEdit, serializeEditorLayersForExport } from "@/lib/editor-text-edit";
import { updateProject } from "@/lib/deck-store";

export function EditorStage({ project }: { readonly project: DeckProject }) {
  const navigate = useNavigate();
  const [layers, setLayers] = useState<EditableLayerModel[]>(project.layers ?? []);
  const [selected, setSelected] = useState(layers[0]?.slideNumber ?? 1);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

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
    if (result.kind !== "updated") return;
    persistLayers([...result.models]);
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
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-[1500px] flex-1 px-8 py-12">
        <StageHeader num="09" sub="Editor · Canvas" title="편집기" />
        <div className="grid grid-cols-[140px_minmax(460px,1fr)_280px] gap-5">
          <SlideList
            layers={layers}
            selected={selected}
            onSelect={(slideNumber) => {
              setSelected(slideNumber);
              setSelectedLayerId(null);
            }}
          />
          <div className="border border-border bg-paper">
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
      </div>
      <GateBar
        hint="편집을 마치면 최종 보고서를 생성합니다."
        approve={{ label: "최종화하고 내보내기로 이동", onClick: finalize }}
      />
    </div>
  );
}

function SlideList({
  layers,
  selected,
  onSelect,
}: {
  readonly layers: readonly EditableLayerModel[];
  readonly selected: number;
  readonly onSelect: (slideNumber: number) => void;
}) {
  return (
    <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
      {layers.map((model) => (
        <li key={model.slideNumber}>
          <button
            type="button"
            onClick={() => onSelect(model.slideNumber)}
            className={`w-full border px-3 py-2 text-left text-xs ${
              selected === model.slideNumber
                ? "border-foreground bg-paper"
                : "border-transparent hover:bg-paper"
            }`}
          >
            <span className="font-mono text-muted-foreground">
              #{String(model.slideNumber).padStart(2, "0")}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function LayerList({
  current,
  selectedLayerId,
  onSelectLayer,
}: {
  readonly current: EditableLayerModel | undefined;
  readonly selectedLayerId: string | null;
  readonly onSelectLayer: (layerId: string) => void;
}) {
  return (
    <>
      <div className="mt-5 text-[11px] uppercase tracking-wider text-muted-foreground">Layers</div>
      <ul className="mt-2 space-y-1">
        {current?.layers.map((layer) => (
          <li key={layer.id}>
            <button
              type="button"
              onClick={() => onSelectLayer(layer.id)}
              disabled={!layer.editable}
              className={`flex w-full items-center justify-between border px-3 py-2 text-left text-xs ${
                selectedLayerId === layer.id ? "border-accent bg-paper" : "border-border"
              } ${!layer.editable ? "opacity-40" : "hover:bg-paper"}`}
            >
              <span>{layer.role}</span>
              <span className="font-mono text-muted-foreground">{layer.type}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function EditorStats({
  layerCount,
  textLayerCount,
  performancePassed,
}: {
  readonly layerCount: number;
  readonly textLayerCount: number;
  readonly performancePassed: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <Stat label="layers" value={String(layerCount)} />
      <Stat label="text" value={String(textLayerCount)} />
      <Stat label="5s" value={performancePassed ? "pass" : "check"} />
    </div>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border border-border bg-background px-3 py-2">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
