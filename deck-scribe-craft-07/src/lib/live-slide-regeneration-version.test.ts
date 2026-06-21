import { describe, expect, test } from "bun:test";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import { createLiveSlideRegenerationCandidate } from "./live-slide-regeneration";
import {
  approvedSlideFixture,
  liveRegenerationRequestFixture,
  slideImageArtifactFixture,
  slideSpecFixture,
} from "./live-slide-regeneration-test-fixtures";

describe("live full-slide regeneration artifact version", () => {
  test("blocks a regenerated background whose stored version does not match the candidate slide", async () => {
    // Given
    const candidateBackground = await storedCandidateBackground({
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
      candidateSlideSpec: slideSpecFixture(),
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

  test("blocks a regenerated background without provider turn evidence", async () => {
    // Given
    const storedBackground = await storedCandidateBackground({
      artifact: slideImageArtifactFixture({ providerId: "codex" }),
      createdAt: 1_789_900_011,
    });
    const candidateBackground = {
      ...storedBackground,
      metadata: {
        ...storedBackground.metadata,
        request: { ...storedBackground.metadata.request, turnId: "" },
      },
      provenance: { ...storedBackground.provenance, turnId: "" },
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
      "missing_regeneration_request_id",
    ]);
  });

  test("blocks a regenerated background that reuses the original provider turn or request id", async () => {
    // Given
    const candidateBackground = await storedCandidateBackground({
      artifact: slideImageArtifactFixture({ requestId: "img_req_original" }),
      createdAt: 1_789_900_012,
    });

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
      "regeneration_request_id_not_new",
    ]);
  });

  test("blocks regenerated background turn or request ids that disagree with stored provenance", async () => {
    // Given
    const storedBackground = await storedCandidateBackground({
      artifact: slideImageArtifactFixture({ requestId: "img_req_revised" }),
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
      candidateSlideSpec: slideSpecFixture(),
      candidateVersion: 2,
    });

    // Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.failure.issues.map((issue) => issue.code)).toEqual([
      "regeneration_request_provenance_mismatch",
    ]);
  });

  test("blocks regenerated backgrounds with malformed stored hashes", async () => {
    // Given
    const storedBackground = await storedCandidateBackground({
      artifact: slideImageArtifactFixture({ requestId: "img_req_revised" }),
      createdAt: 1_789_900_014,
    });
    const candidateBackground = {
      ...storedBackground,
      binary: { ...storedBackground.binary, hash: "sha256:not-a-digest" },
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
      "invalid_regeneration_background_hash",
    ]);
  });

  test("blocks regenerated backgrounds with mismatched stored image paths", async () => {
    // Given
    const storedBackground = await storedCandidateBackground({
      artifact: slideImageArtifactFixture({ requestId: "img_req_revised" }),
      createdAt: 1_789_900_017,
    });
    const candidateBackground = {
      ...storedBackground,
      binary: {
        ...storedBackground.binary,
        path: "projects/project_001/slides/images/other.v2.png",
      },
      metadata: {
        ...storedBackground.metadata,
        path: "projects/project_001/slides/images/other.v2.metadata.json",
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
  });

  test("blocks regenerated backgrounds without production live provider provenance", async () => {
    // Given
    const storedBackground = await storedCandidateBackground({
      artifact: slideImageArtifactFixture({ requestId: "img_req_revised" }),
      createdAt: 1_789_900_015,
    });
    const candidateBackground = {
      ...storedBackground,
      provenance: {
        ...storedBackground.provenance,
        executionMode: "development" as const,
        authMode: "none" as const,
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
      "regeneration_background_not_live",
    ]);
  });

  test("blocks candidates built from a different approved slide or stale original version", async () => {
    // Given
    const candidateBackground = await storedCandidateBackground({
      version: 3,
      createdAt: 1_789_900_016,
    });

    // When
    const result = createLiveSlideRegenerationCandidate({
      request: liveRegenerationRequestFixture(),
      originalSlide: { ...approvedSlideFixture(), number: 4, version: 2 },
      candidateBackground,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateSlideSpec: slideSpecFixture(),
      candidateVersion: 3,
    });

    // Then
    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.failure.issues.map((issue) => issue.code)).toEqual([
      "original_slide_mismatch",
      "original_slide_version_mismatch",
    ]);
  });
});

async function storedCandidateBackground(options: {
  readonly artifact?: ReturnType<typeof slideImageArtifactFixture>;
  readonly version?: number;
  readonly createdAt: number;
}) {
  const store = createImageArtifactStore({ write: async () => undefined });
  return storeSlideImageArtifact({
    store,
    projectId: "project_001",
    artifact: options.artifact ?? slideImageArtifactFixture(),
    version: options.version ?? 2,
    createdAt: options.createdAt,
    extraInputArtifactIds: ["project_001_image_slide_003_v0"],
  });
}
