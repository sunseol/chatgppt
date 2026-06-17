import { useEffect, useState, useCallback } from "react";
import type { DeckProject, Stage, StepKey } from "./deck-types";
import { stageToStep, stepIndex, STEPS } from "./deck-types";

const KEY = "deckforge.projects.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function load(): DeckProject[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DeckProject[];
  } catch {
    return [];
  }
}

function save(list: DeckProject[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
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
  const p: DeckProject = {
    id: "p_" + Math.random().toString(36).slice(2, 10),
    name: input.name,
    initialPrompt: input.initialPrompt,
    slideCount: input.slideCount,
    aspectRatio: input.aspectRatio,
    language: input.language,
    stage: "PROJECT_CREATED",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    invalidated: {},
    approvalLog: [],
  };
  const list = load();
  list.push(p);
  save(list);
  return p;
}

export function updateProject(
  id: string,
  patch: Partial<DeckProject> | ((p: DeckProject) => Partial<DeckProject>)
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

const DOWNSTREAM: Record<StepKey, StepKey[]> = {
  project: ["interview", "research", "plan", "design", "layout", "generate", "review", "vectorize", "editor", "export"],
  interview: ["research", "plan", "design", "layout", "generate", "review", "vectorize", "editor", "export"],
  research: ["plan", "design", "layout", "generate", "review", "vectorize", "editor", "export"],
  plan: ["design", "layout", "generate", "review", "vectorize", "editor", "export"],
  design: ["layout", "generate", "review", "vectorize", "editor", "export"],
  layout: ["generate", "review", "vectorize", "editor", "export"],
  generate: ["review", "vectorize", "editor", "export"],
  review: ["vectorize", "editor", "export"],
  vectorize: ["editor", "export"],
  editor: ["export"],
  export: [],
};

export function invalidateDownstream(id: string, fromStep: StepKey) {
  const list = load();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const inv = { ...list[idx].invalidated };
  for (const k of DOWNSTREAM[fromStep]) inv[k] = true;
  list[idx] = { ...list[idx], invalidated: inv, updatedAt: Date.now() };
  save(list);
}

export function approveStage(id: string, step: StepKey, nextStage: Stage, hash: string) {
  const list = load();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const p = list[idx];
  const inv = { ...p.invalidated };
  delete inv[step];
  list[idx] = {
    ...p,
    stage: nextStage,
    invalidated: inv,
    approvalLog: [...p.approvalLog, { stage: step, at: Date.now(), hash }],
    updatedAt: Date.now(),
  };
  save(list);
}

export function useProject(id: string | undefined) {
  const [project, setProject] = useState<DeckProject | undefined>(() =>
    id ? getProject(id) : undefined
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

export function isStepReachable(p: DeckProject, step: StepKey) {
  const currentStep = stageToStep(p.stage);
  return stepIndex(step) <= stepIndex(currentStep);
}

export { STEPS, stageToStep, stepIndex };
