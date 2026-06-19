import { describe, expect, test } from "bun:test";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import { createLiveSlideRegenerationCandidate } from "./live-slide-regeneration";
import {
  approvedSlideFixture,
  liveRegenerationRequestFixture,
  slideImageArtifactFixture,
} from "./live-slide-regeneration-test-fixtures";

describe("live full-slide regeneration artifact version", () => {
  test("blocks a regenerated background whose stored version does not match the candidate slide", async () => {
    // Given
    const store = createImageArtifactStore({ write: async () => undefined });
    const candidateBackground = await storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: slideImageArtifactFixture(),
      version: 1,
      createdAt: 1_789_900_010,
    });

    // When
    const result = createLiveSlideRegenerationCandidate({
      request: liveRegenerationRequestFixture(),
      originalSlide: approvedSlideFixture(),
      candidateBackground,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateVersion: 2,
    });

    // Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.failure.issues.map((issue) => issue.code)).toEqual([
      "background_artifact_version_mismatch",
    ]);
    expect(result.preservedSlide).toEqual(approvedSlideFixture());
  });

  test("blocks a regenerated background without provider request id evidence", async () => {
    // Given
    const store = createImageArtifactStore({ write: async () => undefined });
    const candidateBackground = await storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: slideImageArtifactFixture({ providerId: "codex", omitRequestId: true }),
      version: 2,
      createdAt: 1_789_900_011,
    });

    // When
    const result = createLiveSlideRegenerationCandidate({
      request: liveRegenerationRequestFixture(),
      originalSlide: approvedSlideFixture(),
      candidateBackground,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateVersion: 2,
    });

    // Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.failure.issues.map((issue) => issue.code)).toEqual([
      "missing_regeneration_request_id",
    ]);
  });

  test("blocks a regenerated background that reuses the original provider request id", async () => {
    // Given
    const store = createImageArtifactStore({ write: async () => undefined });
    const candidateBackground = await storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: slideImageArtifactFixture({ requestId: "img_req_original" }),
      version: 2,
      createdAt: 1_789_900_012,
    });

    // When
    const result = createLiveSlideRegenerationCandidate({
      request: liveRegenerationRequestFixture(),
      originalSlide: approvedSlideFixture(),
      candidateBackground,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateVersion: 2,
    });

    // Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.failure.issues.map((issue) => issue.code)).toEqual([
      "regeneration_request_id_not_new",
    ]);
  });

  test("blocks regenerated background request ids that disagree with stored provenance", async () => {
    // Given
    const store = createImageArtifactStore({ write: async () => undefined });
    const storedBackground = await storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: slideImageArtifactFixture({ requestId: "img_req_revised" }),
      version: 2,
      createdAt: 1_789_900_013,
    });
    const candidateBackground = {
      ...storedBackground,
      provenance: { ...storedBackground.provenance, requestId: "img_req_original" },
    };

    // When
    const result = createLiveSlideRegenerationCandidate({
      request: liveRegenerationRequestFixture(),
      originalSlide: approvedSlideFixture(),
      candidateBackground,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateVersion: 2,
    });

    // Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.failure.issues.map((issue) => issue.code)).toEqual([
      "regeneration_request_provenance_mismatch",
    ]);
  });
});
