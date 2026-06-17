import { z } from "zod";
import { hashContent } from "./artifacts";
import type { EditableLayerModel } from "./deck-types";

const EDITOR_AUTOSAVE_TYPE = "editor_autosave";
const EDITOR_AUTOSAVE_STORAGE_KEY = "deckforge.editor.autosave.v1";
const EDITOR_AUTOSAVE_STORAGE_VERSION = 1;
const MAX_SNAPSHOTS_PER_PROJECT = 20;

const editorAutosaveReasons = ["edit", "interval", "crash_recovery"] as const;

const boundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const layerSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "shape", "image", "chart"] as const),
  role: z.string(),
  text: z.string().optional(),
  bounds: boundsSchema,
  editable: z.boolean(),
});

const editableLayerModelSchema = z.object({
  slideNumber: z.number(),
  layers: z.array(layerSchema),
});

const editorAutosaveSnapshotSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: z.literal(EDITOR_AUTOSAVE_TYPE),
  path: z.string(),
  hash: z.string().regex(/^sha256:/),
  createdAt: z.number(),
  reason: z.enum(editorAutosaveReasons),
  layers: z.array(editableLayerModelSchema),
});

const editorAutosaveStorageSchema = z.object({
  version: z.literal(EDITOR_AUTOSAVE_STORAGE_VERSION),
  snapshots: z.array(editorAutosaveSnapshotSchema),
});

export type EditorAutosaveReason = (typeof editorAutosaveReasons)[number];
export type EditorAutosaveSnapshot = {
  readonly id: string;
  readonly projectId: string;
  readonly type: typeof EDITOR_AUTOSAVE_TYPE;
  readonly path: string;
  readonly hash: string;
  readonly createdAt: number;
  readonly reason: EditorAutosaveReason;
  readonly layers: readonly EditableLayerModel[];
};
type EditorAutosaveSnapshotBody = Omit<EditorAutosaveSnapshot, "hash">;

export type EditorAutosaveRecovery =
  | {
      readonly kind: "recovered";
      readonly snapshot: EditorAutosaveSnapshot;
      readonly layers: readonly EditableLayerModel[];
    }
  | {
      readonly kind: "empty";
      readonly projectId: string;
    };

export function createEditorAutosaveSnapshot(input: {
  readonly projectId: string;
  readonly layers: readonly EditableLayerModel[];
  readonly reason: EditorAutosaveReason;
  readonly now?: () => number;
}): EditorAutosaveSnapshot {
  const createdAt = input.now?.() ?? Date.now();
  const id = `autosave_${input.projectId}_${createdAt}`;
  const path = `projects/${input.projectId}/autosave/editor/${id}.json`;
  const body: EditorAutosaveSnapshotBody = {
    id,
    projectId: input.projectId,
    type: EDITOR_AUTOSAVE_TYPE,
    path,
    createdAt,
    reason: input.reason,
    layers: cloneLayerModels(input.layers),
  };

  return {
    ...body,
    hash: hashContent(JSON.stringify(body)),
  };
}

export function shouldAutosaveEditor(input: {
  readonly dirty: boolean;
  readonly lastSavedAt: number;
  readonly now: number;
  readonly intervalMs: number;
}): boolean {
  if (input.dirty) return true;
  return input.now - input.lastSavedAt >= input.intervalMs;
}

export function recoverLatestEditorAutosave(input: {
  readonly projectId: string;
  readonly snapshots: readonly EditorAutosaveSnapshot[];
}): EditorAutosaveRecovery {
  let latest: EditorAutosaveSnapshot | undefined;
  for (const snapshot of input.snapshots) {
    if (snapshot.projectId !== input.projectId) continue;
    if (!latest || snapshot.createdAt > latest.createdAt) latest = snapshot;
  }
  if (!latest) return { kind: "empty", projectId: input.projectId };
  return { kind: "recovered", snapshot: latest, layers: cloneLayerModels(latest.layers) };
}

export function serializeEditorAutosaveSnapshots(
  snapshots: readonly EditorAutosaveSnapshot[],
): string {
  return JSON.stringify({
    version: EDITOR_AUTOSAVE_STORAGE_VERSION,
    snapshots,
  });
}

export function parseEditorAutosaveSnapshots(
  raw: string | null,
): readonly EditorAutosaveSnapshot[] {
  if (!raw) return [];
  try {
    const parsed = editorAutosaveStorageSchema.safeParse(parseJson(raw));
    return parsed.success ? parsed.data.snapshots : [];
  } catch (error) {
    if (error instanceof Error) return [];
    throw error;
  }
}

export function loadEditorAutosaveSnapshots(input: {
  readonly projectId: string;
  readonly storage?: Storage;
}): readonly EditorAutosaveSnapshot[] {
  const storage = input.storage ?? getBrowserStorage();
  if (!storage) return [];
  return readStoredSnapshots(storage).filter((snapshot) => snapshot.projectId === input.projectId);
}

export function saveEditorAutosaveSnapshot(input: {
  readonly projectId: string;
  readonly layers: readonly EditableLayerModel[];
  readonly reason: EditorAutosaveReason;
  readonly now?: () => number;
  readonly storage?: Storage;
}): EditorAutosaveSnapshot {
  const snapshot = createEditorAutosaveSnapshot(input);
  const storage = input.storage ?? getBrowserStorage();
  if (!storage) return snapshot;
  const existing = readStoredSnapshots(storage).filter((stored) => stored.id !== snapshot.id);
  const projectSnapshots = [
    snapshot,
    ...existing.filter((stored) => stored.projectId === input.projectId),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_SNAPSHOTS_PER_PROJECT);
  const otherSnapshots = existing.filter((stored) => stored.projectId !== input.projectId);

  try {
    storage.setItem(
      EDITOR_AUTOSAVE_STORAGE_KEY,
      serializeEditorAutosaveSnapshots([...projectSnapshots, ...otherSnapshots]),
    );
  } catch (error) {
    if (error instanceof Error) return snapshot;
    throw error;
  }
  return snapshot;
}

function cloneLayerModels(layers: readonly EditableLayerModel[]): EditableLayerModel[] {
  return layers.map((model) => ({
    slideNumber: model.slideNumber,
    layers: model.layers.map((layer) => ({
      ...layer,
      bounds: { ...layer.bounds },
    })),
  }));
}

function readStoredSnapshots(storage: Storage): readonly EditorAutosaveSnapshot[] {
  try {
    return parseEditorAutosaveSnapshots(storage.getItem(EDITOR_AUTOSAVE_STORAGE_KEY));
  } catch (error) {
    if (error instanceof Error) return [];
    throw error;
  }
}

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw);
}
