import type { DeckPlan, DesignSystem, GeneratedSlide, SlideSpec } from "./deck-types";
import { hashContent } from "./artifacts";

export interface SlideRevisionArtifact {
  readonly id: string;
  readonly projectId: string;
  readonly type: "slide_revision";
  readonly path: string;
  readonly hash: string;
  readonly createdAt: number;
}

export interface SlideRevisionRequest {
  readonly id: string;
  readonly slideNumber: number;
  readonly originalSlideVersion: number;
  readonly editInstruction: string;
  readonly mustKeep: readonly string[];
  readonly mustChange: readonly string[];
  readonly designSystemId: string;
  readonly slidePlanId: string;
  readonly artifact: SlideRevisionArtifact;
}

export interface CreateSlideRevisionRequestInput {
  readonly projectId: string;
  readonly instruction: string;
  readonly slide: GeneratedSlide;
  readonly slideSpec: SlideSpec;
  readonly design: DesignSystem;
  readonly plan: DeckPlan;
  readonly now?: () => number;
  readonly createId?: () => string;
}

export class SlideRevisionContextError extends Error {
  readonly slideNumber: number;
  readonly slideSpecNumber: number;

  constructor(slideNumber: number, slideSpecNumber: number) {
    super(`Slide ${slideNumber} does not match slide spec ${slideSpecNumber}.`);
    this.name = "SlideRevisionContextError";
    this.slideNumber = slideNumber;
    this.slideSpecNumber = slideSpecNumber;
  }
}

const DEFAULT_MUST_KEEP = [
  "title text",
  "main statistics",
  "source caption",
  "background style",
  "approved color palette",
  "global design style",
  "layout hierarchy",
] as const;

export function createSlideRevisionRequest(
  input: CreateSlideRevisionRequestInput,
): SlideRevisionRequest {
  if (input.slide.number !== input.slideSpec.number) {
    throw new SlideRevisionContextError(input.slide.number, input.slideSpec.number);
  }
  const id = input.createId?.() ?? `rev_${Date.now().toString(36)}`;
  const createdAt = input.now?.() ?? Date.now();
  const editInstruction = input.instruction.trim();
  const mustChange = inferMustChange(editInstruction);
  const requestWithoutArtifact = {
    id,
    slideNumber: input.slide.number,
    originalSlideVersion: input.slide.version,
    editInstruction,
    mustKeep: mustKeepForTargets(mustChange),
    mustChange,
    designSystemId: input.design.id,
    slidePlanId: input.plan.id,
  };
  return {
    ...requestWithoutArtifact,
    artifact: {
      id,
      projectId: input.projectId,
      type: "slide_revision",
      path: revisionArtifactPath(input.projectId, input.slide.number, id),
      hash: hashContent(JSON.stringify(requestWithoutArtifact)),
      createdAt,
    },
  };
}

function inferMustChange(instruction: string): readonly string[] {
  const targets: string[] = [];
  if (/제목|title/i.test(instruction)) targets.push("title text");
  if (/그래프|차트|chart|graph/i.test(instruction)) {
    targets.push(
      /크게|확대|넓게|bigger|larger/i.test(instruction) ? "chart area size" : "chart area",
    );
  }
  if (/배경|background/i.test(instruction)) targets.push("background style");
  if (/출처|source/i.test(instruction) && !/유지|preserve|keep/i.test(instruction)) {
    targets.push("source caption");
  }
  return unique(targets.length > 0 ? targets : ["requested visual area"]);
}

function mustKeepForTargets(mustChange: readonly string[]): readonly string[] {
  const targetSet = new Set(mustChange);
  return DEFAULT_MUST_KEEP.filter((item) => !targetSet.has(item));
}

function revisionArtifactPath(projectId: string, slideNumber: number, revisionId: string): string {
  return `projects/${projectId}/slides/slide_${String(slideNumber).padStart(
    2,
    "0",
  )}/revisions/${revisionId}.json`;
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
