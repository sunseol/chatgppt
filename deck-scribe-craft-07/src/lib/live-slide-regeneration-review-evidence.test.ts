import { describe, expect, test } from "bun:test";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import {
  createLiveSlideRegenerationCandidate,
  type LiveSlideRegenerationCandidate,
} from "./live-slide-regeneration";
import { writeLiveSlideRegenerationReviewEvidence } from "./live-slide-regeneration-review-evidence";
import {
  approvedSlideFixture,
  liveRegenerationRequestFixture,
  slideImageArtifactFixture,
  slideSpecFixture,
} from "./live-slide-regeneration-test-fixtures";
import type { SlideRevisionComparison } from "./slide-revision-generation";

describe("live slide regeneration review evidence", () => {
  test("rejects approved review evidence whose approved slide drifts from the candidate", async () => {
    // Given
    const candidate = await readyCandidate();
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const error = await caughtError(() =>
      writeLiveSlideRegenerationReviewEvidence({
        store: {
          write: async (entry) => {
            writes.push(entry);
          },
        },
        projectId: "project_001",
        eventId: "rev_235",
        exportedAt: 1_789_944_001,
        event: {
          outcome: "approved",
          candidate,
          comparison: matchingComparison(candidate),
          approvedSlide: { ...candidate.slide, version: 99 },
        },
      }),
    );

    // Then
    expect(error instanceof Error).toBe(true);
    expect(writes).toEqual([]);
  });

  test("rejects approved review evidence whose comparison drifts from the candidate", async () => {
    // Given
    const candidate = await readyCandidate();
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const error = await caughtError(() =>
      writeLiveSlideRegenerationReviewEvidence({
        store: {
          write: async (entry) => {
            writes.push(entry);
          },
        },
        projectId: "project_001",
        eventId: "rev_235",
        exportedAt: 1_789_944_001,
        event: {
          outcome: "approved",
          candidate,
          comparison: {
            ...matchingComparison(candidate),
            requestedChanges: ["unrelated logo placement"],
          },
          approvedSlide: { ...candidate.slide, status: "approved" },
        },
      }),
    );

    // Then
    expect(error instanceof Error).toBe(true);
    expect(writes).toEqual([]);
  });
});

async function readyCandidate(): Promise<LiveSlideRegenerationCandidate> {
  const store = createImageArtifactStore({ write: async () => undefined });
  const candidateBackground = await storeSlideImageArtifact({
    store,
    projectId: "project_001",
    artifact: slideImageArtifactFixture({ requestId: "img_req_revised" }),
    version: 2,
    createdAt: 1_789_900_020,
  });
  const result = createLiveSlideRegenerationCandidate({
    request: liveRegenerationRequestFixture(),
    originalSlide: approvedSlideFixture(),
    candidateBackground,
    candidateDeckContextId: "deckctx_001",
    candidateDesignSystemId: "design_001",
    candidateSlideSpec: slideSpecFixture(),
    candidateVersion: 2,
  });
  if (result.kind !== "ready") throw new Error("Expected ready live regeneration candidate.");
  return result.candidate;
}

function matchingComparison(candidate: LiveSlideRegenerationCandidate): SlideRevisionComparison {
  return {
    slideNumber: candidate.slide.number,
    originalSlideVersion: 1,
    revisedSlideVersion: candidate.slide.version,
    beforeImageDescriptor: candidate.beforeImageDescriptor,
    afterImageDescriptor: candidate.afterImageDescriptor,
    requestedChanges: candidate.mustChange,
    preservedTargets: candidate.mustKeep,
    preservationChecks: candidate.mustKeep.map((target) => ({
      target,
      status: "kept" as const,
      message: `${target} preserved during live regeneration.`,
    })),
    summary: "Slide 3 live regeneration comparison is approved.",
  };
}

async function caughtError(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await action();
    return undefined;
  } catch (error) {
    return error;
  }
}
