import { describe, expect, test } from "bun:test";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import { createLiveSlideRegenerationCandidate } from "./live-slide-regeneration";
import {
  approvedSlideFixture,
  liveRegenerationRequestFixture,
  slideImageArtifactFixture,
  slideSpecFixture,
} from "./live-slide-regeneration-test-fixtures";

describe("live full-slide regeneration provenance sidecar", () => {
  test("blocks regenerated backgrounds whose provenance sidecar points at another artifact", async () => {
    // Given
    const store = createImageArtifactStore({ write: async () => undefined });
    const storedBackground = await storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: slideImageArtifactFixture({ requestId: "img_req_revised" }),
      version: 2,
      createdAt: 1_789_900_019,
    });
    const candidateBackground = {
      ...storedBackground,
      provenance: {
        ...storedBackground.provenance,
        artifactId: "project_001_image_slide_004_v2",
        path: "projects/project_001/slides/images/slide_004.v2.provenance.json",
      },
    };

    // When
    const result = createLiveSlideRegenerationCandidate({
      request: liveRegenerationRequestFixture(),
      originalSlide: approvedSlideFixture(),
      candidateBackground,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateSlideSpec: slideSpecFixture(),
      candidateVersion: 2,
    });

    // Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.failure.issues.map((issue) => issue.code)).toEqual([
      "background_artifact_storage_path_mismatch",
    ]);
    expect(result.preservedSlide).toEqual(approvedSlideFixture());
  });
});
