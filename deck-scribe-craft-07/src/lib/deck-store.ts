import { useEffect, useState, useCallback } from "react";
import type { DeckProject, Stage, StepKey } from "./deck-types";
import { stageToStep, stepIndex, STEPS } from "./deck-types";
import type { ArtifactRecord } from "./artifacts";
import { invalidatedAfter, isStepReachable } from "./workflow-engine";
import { createDeckProject } from "./project-creation";
import { parseProjectList, serializeProjectList } from "./project-list-codec";

const KEY = "deckforge.projects.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function load(): DeckProject[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return parseProjectList(raw);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return [];
  }
}

function save(list: DeckProject[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, serializeProjectList(list));
  window.dispatchEvent(new CustomEvent("deckforge:update"));
}

export function listProjects(): DeckProject[] {
  return load().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): DeckProject | undefined {
  return load().find((p) => p.id === id);
}

export function createProject(input: {
  name: string;
  initialPrompt: string;
  slideCount: number;
  aspectRatio: "16:9" | "4:3";
  language: "ko" | "en" | "mixed";
}): DeckProject {
  const p = createDeckProject(input, {
    createId: () => "p_" + Math.random().toString(36).slice(2, 10),
    now: Date.now,
  });
  const list = load();
  list.push(p);
  save(list);
  return p;
}

export function updateProject(
  id: string,
  patch: Partial<DeckProject> | ((p: DeckProject) => Partial<DeckProject>),
) {
  const list = load();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const next = typeof patch === "function" ? patch(list[idx]) : patch;
  list[idx] = { ...list[idx], ...next, updatedAt: Date.now() };
  save(list);
}

export function deleteProject(id: string) {
  save(load().filter((p) => p.id !== id));
}

export function invalidateDownstream(id: string, fromStep: StepKey) {
  const list = load();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const inv = { ...list[idx].invalidated, ...invalidatedAfter(fromStep) };
  list[idx] = { ...list[idx], invalidated: inv, updatedAt: Date.now() };
  save(list);
}

export function approveStage(
  id: string,
  step: StepKey,
  nextStage: Stage,
  hash: string,
  artifact?: ArtifactRecord,
) {
  const list = load();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const p = list[idx];
  const inv = { ...p.invalidated };
  delete inv[step];
  const artifactVersion =
    artifact?.version ?? p.approvalLog.filter((entry) => entry.stage === step).length + 1;
  const entry = {
    stage: step,
    at: Date.now(),
    hash,
    artifactId: artifact?.id ?? `${id}_${step}_v${artifactVersion}`,
    artifactVersion,
    artifactType: artifact?.type ?? step,
  };
  list[idx] = {
    ...p,
    stage: nextStage,
    invalidated: inv,
    approvalLog: [...p.approvalLog, entry],
    updatedAt: Date.now(),
  };
  save(list);
}

export function useProject(id: string | undefined) {
  const [project, setProject] = useState<DeckProject | undefined>(() =>
    id ? getProject(id) : undefined,
  );

  const refresh = useCallback(() => {
    if (!id) return;
    setProject(getProject(id));
  }, [id]);

  useEffect(() => {
    refresh();
    if (!isBrowser()) return;
    const h = () => refresh();
    window.addEventListener("deckforge:update", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("deckforge:update", h);
      window.removeEventListener("storage", h);
    };
  }, [refresh]);

  return project;
}

export function useProjectList() {
  const [list, setList] = useState<DeckProject[]>(() => listProjects());
  useEffect(() => {
    const refresh = () => setList(listProjects());
    refresh();
    if (!isBrowser()) return;
    window.addEventListener("deckforge:update", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("deckforge:update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return list;
}

export { STEPS, stageToStep, stepIndex, isStepReachable };
