import { describe, expect, test } from "bun:test";
import type { ImageArtifactStoreWrite } from "@/lib/image-artifact-store";
import { createImageArtifactStore, storeSlideImageArtifact } from "@/lib/image-artifact-store";
import {
  createLiveSlideRegenerationCandidate,
  type LiveSlideRegenerationCandidate,
} from "@/lib/live-slide-regeneration";
import {
  approvedSlideFixture,
  liveRegenerationRequestFixture,
  slideImageArtifactFixture,
  slideSpecFixture,
} from "@/lib/live-slide-regeneration-test-fixtures";
import type { SlideRevisionComparison } from "@/lib/slide-revision-generation";
import { approveReviewStageRevisionWithEvidence } from "./review-stage-regeneration-evidence";

describe("review stage regeneration approval evidence", () => {
  test("writes preserved evidence when comparison mismatch blocks approval", async () => {
    // Given
    const candidate = await readyCandidate();
    const slides = [approvedSlideFixture()];
    const comparison = {
      ...matchingComparison(candidate),
      afterImageDescriptor:
        "live-regeneration|request=rev_235|background=project_001_image_slide_004_v2",
    };
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const result = await approveReviewStageRevisionWithEvidence({
      projectId: "project_001",
      slides,
      comparison,
      liveCandidate: candidate,
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      now: () => 1_789_930_100,
    });

    // Then
    expect(result.slides).toEqual(slides);
    expect(result.reviewEvidencePath).toBe(
      "projects/project_001/live-evidence/df235-slide-regeneration-review-rev_235.json",
    );
    expect(writes.map((write) => write.path)).toEqual([result.reviewEvidencePath]);
    const content = writes[0]?.content;
    if (typeof content !== "string") throw new Error("Expected review evidence JSON.");
    expect(content.includes('"outcome": "preserved_after_approval_blocked"')).toBe(true);
    expect(content.includes("regeneration_comparison_mismatch")).toBe(true);
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
    extraInputArtifactIds: ["project_001_image_slide_003_v0"],
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
