import { describe, expect, test } from "bun:test";
import { buildLiveBackgroundBatch, validateLiveBackgroundBatch } from "./live-background-batch";
import {
  imageArtifact,
  slidePackages,
  storedArtifact,
  withRequestId,
} from "./live-background-batch-test-fixtures";
import type { StoredSlideImageArtifact } from "./image-artifact-store";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("live background batch uniqueness", () => {
  test("blocks duplicate provider requests and stored binary artifacts", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));
    const firstStored = storedArtifact(artifacts[0]);
    const duplicateArtifacts: readonly SlideImageArtifact[] = [
      artifacts[0],
      withRequestId(artifacts[1], "img_req_001"),
      artifacts[2],
      artifacts[3],
      artifacts[4],
    ];
    const duplicateStoredArtifacts: readonly StoredSlideImageArtifact[] = [
      firstStored,
      { ...storedArtifact(duplicateArtifacts[1]), binary: firstStored.binary },
      storedArtifact(artifacts[2]),
      storedArtifact(artifacts[3]),
      storedArtifact(artifacts[4]),
    ];

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_duplicate_evidence",
        deckContextId: "deck_context_001",
        designSystemId: "design_001",
        artifacts: duplicateArtifacts,
        storedArtifacts: duplicateStoredArtifacts,
        promptPackages: packages,
      }),
    );

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "duplicate_provider_request_metadata",
      "duplicate_stored_background_artifact",
      "stored_background_artifact_mismatch",
    ]);
  });

  test("accepts prompt packages matched by slide number instead of array order", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));
    const storedArtifacts = artifacts.map((artifact) => storedArtifact(artifact));

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_shuffled_prompts",
        deckContextId: "deck_context_001",
        designSystemId: "design_001",
        artifacts,
        storedArtifacts,
        promptPackages: [...packages].reverse(),
      }),
    );

    // Then
    expect(validation).toEqual({ kind: "ready" });
  });
});
