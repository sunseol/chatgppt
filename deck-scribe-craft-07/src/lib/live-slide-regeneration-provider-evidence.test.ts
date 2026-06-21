import { describe, expect, test } from "bun:test";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import { createLiveSlideRegenerationCandidate } from "./live-slide-regeneration";
import {
  approvedSlideFixture,
  liveRegenerationRequestFixture,
  slideImageArtifactFixture,
  slideSpecFixture,
} from "./live-slide-regeneration-test-fixtures";

describe("live slide regeneration provider evidence", () => {
  test("blocks Codex turn evidence that only becomes canonical after trimming", async () => {
    // Given
    const store = createImageArtifactStore({ write: async () => undefined });
    const storedBackground = await storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: slideImageArtifactFixture({ providerId: "codex", omitRequestId: true }),
      version: 2,
      createdAt: 1_789_900_018,
    });
    const candidateBackground = {
      ...storedBackground,
      metadata: {
        ...storedBackground.metadata,
        request: {
          ...storedBackground.metadata.request,
          turnId: " turn_codex_image_revised ",
        },
      },
      provenance: {
        ...storedBackground.provenance,
        turnId: " turn_codex_image_revised ",
      },
    };

    // When
    const result = createLiveSlideRegenerationCandidate({
      request: liveRegenerationRequestFixture({
        originalBackgroundRequestId: "turn_codex_image_original",
      }),
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
      "missing_regeneration_request_id",
    ]);
  });
});
