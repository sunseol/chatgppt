import type { DeckProject, GeneratedSlide } from "@/lib/deck-types";
import type { ImageArtifactStore } from "@/lib/image-artifact-store";
import type { CodexImageClient } from "@/lib/codex-image-provider";
import { createBrowserImageArtifactStore } from "@/lib/browser-image-artifact-store";
import { readBrowserStoredImageArtifactEvidence } from "@/lib/browser-image-artifact-evidence";
import { createDesktopCodexImageClient } from "@/lib/desktop-codex-image-generation";
import {
  approveLiveSlideRegenerationCandidate,
  type LiveSlideRegenerationCandidate,
} from "@/lib/live-slide-regeneration";
import { runCodexLiveSlideRegenerationSession } from "@/lib/live-slide-regeneration-session";
import type { SlideRevisionComparison } from "@/lib/slide-revision-generation";
import { fakeAsync } from "@/components/deck/stage-timing";
import { preservedLiveRegenerationFailure } from "./review-stage-regeneration-evidence";

export type ReviewStageRegenerationResult = {
  readonly slides: readonly GeneratedSlide[];
  readonly comparison: SlideRevisionComparison | null;
  readonly liveCandidate: LiveSlideRegenerationCandidate | null;
  readonly editConsumed: boolean;
  readonly reviewEvidencePath: string | null;
};

export async function runReviewStageSlideRegeneration(input: {
  readonly project: DeckProject;
  readonly slides: readonly GeneratedSlide[];
  readonly selected: number | null;
  readonly instruction: string;
  readonly client?: CodexImageClient;
  readonly store?: ImageArtifactStore;
  readonly storage?: Storage;
  readonly wait?: () => Promise<void>;
  readonly now?: () => number;
  readonly createId?: () => string;
}): Promise<ReviewStageRegenerationResult> {
  const original = input.slides.find((slide) => slide.number === input.selected);
  const instruction = input.instruction.trim();
  if (original === undefined || instruction.length === 0) return unchanged(input.slides);

  if (canRunCodexLiveRegeneration(input.project, original)) {
    const liveResult = await runCodexReviewRegeneration({ ...input, original, instruction });
    if (liveResult !== undefined) return liveResult;
  }

  await (input.wait ?? (() => fakeAsync(null, 800)))();
  return runLocalReviewRegeneration(input.slides, original, instruction);
}

export function approveReviewStageRevision(input: {
  readonly slides: readonly GeneratedSlide[];
  readonly comparison: SlideRevisionComparison;
  readonly liveCandidate: LiveSlideRegenerationCandidate | null;
}): readonly GeneratedSlide[] {
  if (input.liveCandidate !== null) {
    return approveLiveSlideRegenerationCandidate(
      input.slides,
      input.liveCandidate,
      input.comparison,
    );
  }
  return input.slides.map((slide) =>
    slide.number === input.comparison.slideNumber ? { ...slide, status: "approved" } : slide,
  );
}

export function approveSelectedReviewSlide(
  slides: readonly GeneratedSlide[],
  selected: number | null,
): readonly GeneratedSlide[] {
  return slides.map((slide) =>
    slide.number === selected ? { ...slide, status: "approved" } : slide,
  );
}

async function runCodexReviewRegeneration(input: {
  readonly project: DeckProject;
  readonly slides: readonly GeneratedSlide[];
  readonly original: GeneratedSlide;
  readonly instruction: string;
  readonly client?: CodexImageClient;
  readonly store?: ImageArtifactStore;
  readonly storage?: Storage;
  readonly now?: () => number;
  readonly createId?: () => string;
}): Promise<ReviewStageRegenerationResult | undefined> {
  const evidence = readBrowserStoredImageArtifactEvidence(input.original.notes, input.storage);
  if (evidence.kind !== "ready" || evidence.evidence.providerId !== "codex") return undefined;
  const store = input.store ?? createBrowserImageArtifactStore(input.storage);
  const result = await runCodexLiveSlideRegenerationSession({
    project: { ...input.project, slides: [...input.slides] },
    slideNumber: input.original.number,
    instruction: input.instruction,
    originalBackground: {
      artifactId: evidence.evidence.artifactId,
      providerRunId: evidence.evidence.providerRunId,
    },
    client: input.client ?? createDesktopCodexImageClient(),
    store,
    now: input.now,
    createId: input.createId,
  });
  switch (result.kind) {
    case "ready":
      return {
        slides: input.slides,
        comparison: result.comparison,
        liveCandidate: result.candidate,
        editConsumed: true,
        reviewEvidencePath: null,
      };
    case "failed":
      return preservedLiveRegenerationFailure(input, store, {
        eventId: result.requestId ?? fallbackReviewEventId(input),
        issues: result.issues,
        userMessage: result.userMessage,
        preservedSlide: result.preservedSlide,
      });
    case "blocked":
      return preservedLiveRegenerationFailure(input, store, {
        eventId: fallbackReviewEventId(input),
        issues: result.issues,
        userMessage: "Live regeneration was blocked before provider submission.",
        preservedSlide: input.original,
      });
    default:
      return assertNever(result);
  }
}

function canRunCodexLiveRegeneration(project: DeckProject, slide: GeneratedSlide): boolean {
  return (
    project.imagePathDecision?.status === "locked" &&
    project.imagePathDecision.providerId === "codex" &&
    slide.status === "approved"
  );
}

function runLocalReviewRegeneration(
  slides: readonly GeneratedSlide[],
  original: GeneratedSlide,
  instruction: string,
): ReviewStageRegenerationResult {
  const next = slides.map((slide) =>
    slide.number === original.number
      ? {
          ...slide,
          version: slide.version + 1,
          imageDescriptor: `${slide.imageDescriptor}|revision:v${slide.version + 1}|${instruction}`,
          notes: instruction,
        }
      : slide,
  );
  const revised = next.find((slide) => slide.number === original.number);
  return {
    slides: next,
    comparison:
      revised === undefined ? null : createReviewRevisionComparison(original, revised, instruction),
    liveCandidate: null,
    editConsumed: true,
    reviewEvidencePath: null,
  };
}

function unchanged(slides: readonly GeneratedSlide[]): ReviewStageRegenerationResult {
  return {
    slides,
    comparison: null,
    liveCandidate: null,
    editConsumed: false,
    reviewEvidencePath: null,
  };
}

function fallbackReviewEventId(input: {
  readonly original: GeneratedSlide;
  readonly now?: () => number;
}): string {
  return `slide_${String(input.original.number).padStart(3, "0")}_${input.now?.() ?? Date.now()}`;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled review stage regeneration result: ${String(value)}`);
}

function createReviewRevisionComparison(
  original: GeneratedSlide,
  revised: GeneratedSlide,
  instruction: string,
): SlideRevisionComparison {
  const preservedTargets = ["제목", "주요 수치", "출처 캡션", "승인한 색상"];
  return {
    slideNumber: original.number,
    originalSlideVersion: original.version,
    revisedSlideVersion: revised.version,
    beforeImageDescriptor: original.imageDescriptor,
    afterImageDescriptor: revised.imageDescriptor,
    requestedChanges: [instruction],
    preservedTargets,
    preservationChecks: preservedTargets.map((target) => ({
      target,
      status: "kept",
      message: `${target} 유지`,
    })),
    summary: `${original.number}번 슬라이드 수정본이 요청 내용을 반영했습니다.`,
  };
}
