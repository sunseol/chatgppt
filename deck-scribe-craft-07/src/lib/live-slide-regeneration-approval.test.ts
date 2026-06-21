import { describe, expect, test } from "bun:test";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import {
  approveLiveSlideRegenerationCandidate,
  createLiveSlideRegenerationCandidate,
  liveSlideRegenerationApprovalIssues,
  type LiveSlideRegenerationCandidate,
} from "./live-slide-regeneration";
import {
  approvedSlideFixture,
  liveRegenerationRequestFixture,
  slideImageArtifactFixture,
  slideSpecFixture,
} from "./live-slide-regeneration-test-fixtures";
import type { SlideRevisionComparison } from "./slide-revision-generation";

describe("live full-slide regeneration approval evidence", () => {
  test("preserves the approved original when approval has no before/after comparison", async () => {
    // Given
    const candidate = await readyCandidate();
    const originalSlides = [approvedSlideFixture()];

    // When
    const approved = approveLiveSlideRegenerationCandidate(originalSlides, candidate);

    // Then
    expect(approved).toEqual(originalSlides);
    expect(
      liveSlideRegenerationApprovalIssues({
        slides: originalSlides,
        candidate,
      }).map((issue) => issue.code),
    ).toEqual(["missing_regeneration_comparison"]);
  });

  test("approves a regenerated candidate only when comparison evidence matches it", async () => {
    // Given
    const candidate = await readyCandidate();
    const originalSlides = [approvedSlideFixture()];
    const comparison = matchingComparison(candidate);

    // When
    const approved = approveLiveSlideRegenerationCandidate(originalSlides, candidate, comparison);

    // Then
    expect(approved[0]?.status).toBe("approved");
    expect(approved[0]?.version).toBe(2);
    expect(approved[0]?.imageDescriptor).toBe(candidate.afterImageDescriptor);
  });

  test("preserves the approved original when comparison evidence points at another artifact", async () => {
    // Given
    const candidate = await readyCandidate();
    const originalSlides = [approvedSlideFixture()];
    const comparison = {
      ...matchingComparison(candidate),
      afterImageDescriptor:
        "live-regeneration|request=rev_235|background=project_001_image_slide_004_v2",
    };

    // When
    const approved = approveLiveSlideRegenerationCandidate(originalSlides, candidate, comparison);

    // Then
    expect(approved).toEqual(originalSlides);
    expect(
      liveSlideRegenerationApprovalIssues({
        slides: originalSlides,
        candidate,
        comparison,
      }).map((issue) => issue.code),
    ).toEqual(["regeneration_comparison_mismatch"]);
  });

  test("preserves the approved original when comparison targets drift from the request", async () => {
    // Given
    const candidate = await readyCandidate();
    const originalSlides = [approvedSlideFixture()];
    const comparison = {
      ...matchingComparison(candidate),
      requestedChanges: ["unrelated logo placement"],
    };

    // When
    const approved = approveLiveSlideRegenerationCandidate(originalSlides, candidate, comparison);

    // Then
    expect(approved).toEqual(originalSlides);
    expect(
      liveSlideRegenerationApprovalIssues({
        slides: originalSlides,
        candidate,
        comparison,
      }).map((issue) => issue.code),
    ).toEqual(["regeneration_comparison_mismatch"]);
  });

  test("preserves the approved original when comparison targets are not canonical", async () => {
    // Given
    const candidate = await readyCandidate();
    const originalSlides = [approvedSlideFixture()];
    const comparison = {
      ...matchingComparison(candidate),
      preservedTargets: candidate.mustKeep.map((target) => ` ${target} `),
    };

    // When
    const approved = approveLiveSlideRegenerationCandidate(originalSlides, candidate, comparison);

    // Then
    expect(approved).toEqual(originalSlides);
    expect(
      liveSlideRegenerationApprovalIssues({
        slides: originalSlides,
        candidate,
        comparison,
      }).map((issue) => issue.code),
    ).toEqual(["regeneration_comparison_mismatch"]);
  });

  test("preserves the approved original when comparison preservation checks fail", async () => {
    // Given
    const candidate = await readyCandidate();
    const originalSlides = [approvedSlideFixture()];
    const changedTarget = firstMustKeepTarget(candidate);
    const comparison = {
      ...matchingComparison(candidate),
      preservationChecks: candidate.mustKeep.map((target) => ({
        target,
        status: target === changedTarget ? ("changed" as const) : ("kept" as const),
        message:
          target === changedTarget
            ? `${target} changed during live regeneration.`
            : `${target} preserved during live regeneration.`,
      })),
    };

    // When
    const approved = approveLiveSlideRegenerationCandidate(originalSlides, candidate, comparison);

    // Then
    expect(approved).toEqual(originalSlides);
    expect(
      liveSlideRegenerationApprovalIssues({
        slides: originalSlides,
        candidate,
        comparison,
      }).map((issue) => issue.code),
    ).toEqual(["regeneration_preservation_check_failed"]);
  });
});

async function readyCandidate() {
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

function firstMustKeepTarget(candidate: LiveSlideRegenerationCandidate): string {
  const target = candidate.mustKeep[0];
  if (target === undefined) throw new Error("Expected at least one must-keep target.");
  return target;
}
