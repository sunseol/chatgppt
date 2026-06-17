import { useCallback, useEffect, useRef, useState } from "react";
import type { EditableLayerModel } from "@/lib/deck-types";
import {
  loadEditorAutosaveSnapshots,
  recoverLatestEditorAutosave,
  saveEditorAutosaveSnapshot,
  shouldAutosaveEditor,
  type EditorAutosaveReason,
} from "@/lib/editor-autosave";

const DEFAULT_EDITOR_AUTOSAVE_INTERVAL_MS = 10_000;

export function useEditorAutosave(input: {
  readonly projectId: string;
  readonly projectUpdatedAt: number;
  readonly layers: readonly EditableLayerModel[];
  readonly onRecover: (layers: EditableLayerModel[]) => void;
  readonly intervalMs?: number;
}) {
  const {
    intervalMs = DEFAULT_EDITOR_AUTOSAVE_INTERVAL_MS,
    layers,
    onRecover,
    projectId,
    projectUpdatedAt,
  } = input;
  const [lastSavedAt, setLastSavedAt] = useState(() => Date.now());
  const recovered = useRef(false);

  useEffect(() => {
    if (recovered.current) return;
    recovered.current = true;
    const recovery = recoverLatestEditorAutosave({
      projectId,
      snapshots: loadEditorAutosaveSnapshots({ projectId }),
    });
    if (recovery.kind !== "recovered") return;
    if (recovery.snapshot.createdAt <= projectUpdatedAt) return;
    onRecover([...recovery.layers]);
  }, [onRecover, projectId, projectUpdatedAt]);

  const saveSnapshot = useCallback(
    (layers: readonly EditableLayerModel[], reason: EditorAutosaveReason) => {
      const snapshot = saveEditorAutosaveSnapshot({
        projectId,
        layers,
        reason,
      });
      setLastSavedAt(snapshot.createdAt);
    },
    [projectId],
  );

  useEffect(() => {
    if (typeof window === "undefined" || layers.length === 0) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (!shouldAutosaveEditor({ dirty: false, lastSavedAt, now, intervalMs })) return;
      const snapshot = saveEditorAutosaveSnapshot({
        projectId,
        layers,
        reason: "interval",
        now: () => now,
      });
      setLastSavedAt(snapshot.createdAt);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [layers, projectId, intervalMs, lastSavedAt]);

  return { saveSnapshot };
}
