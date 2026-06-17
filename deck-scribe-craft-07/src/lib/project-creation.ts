import type { DeckProject } from "./deck-types";

const MIN_SLIDE_COUNT = 5;
const MAX_SLIDE_COUNT = 12;

export interface ProjectCreationInput {
  readonly name: string;
  readonly initialPrompt: string;
  readonly slideCount: number;
  readonly aspectRatio: "16:9" | "4:3";
  readonly language: "ko" | "en" | "mixed";
}

export interface ProjectCreationOptions {
  readonly createId: () => string;
  readonly now: () => number;
}

export class ProjectCreationInputError extends Error {
  constructor(field: "name" | "initialPrompt") {
    super(`Project ${field} is required.`);
    this.name = "ProjectCreationInputError";
  }
}

export function createDeckProject(
  input: ProjectCreationInput,
  options: ProjectCreationOptions,
): DeckProject {
  const createdAt = options.now();
  return {
    id: options.createId(),
    name: requireText(input.name, "name"),
    initialPrompt: requireText(input.initialPrompt, "initialPrompt"),
    slideCount: normalizeSlideCount(input.slideCount),
    aspectRatio: input.aspectRatio,
    language: input.language,
    stage: "PROJECT_CREATED",
    createdAt,
    updatedAt: createdAt,
    invalidated: {},
    approvalLog: [],
  };
}

function requireText(value: string, field: "name" | "initialPrompt"): string {
  const trimmed = value.trim();
  if (!trimmed) throw new ProjectCreationInputError(field);
  return trimmed;
}

function normalizeSlideCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_SLIDE_COUNT;
  return Math.min(MAX_SLIDE_COUNT, Math.max(MIN_SLIDE_COUNT, Math.round(value)));
}
