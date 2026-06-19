import { describe, expect, test } from "bun:test";
import { buildLiveBackgroundBatch, validateLiveBackgroundBatch } from "./live-background-batch";
import {
  imageArtifact,
  slidePackages,
  storedArtifact,
} from "./live-background-batch-test-fixtures";

describe("live background batch request model evidence", () => {
  test("blocks stored background evidence from a different request model", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));
    const firstStoredArtifact = storedArtifact(artifacts[0]);
    const storedArtifacts = artifacts.map((artifact, index) =>
      index === 0
        ? {
            ...firstStoredArtifact,
            metadata: {
              ...firstStoredArtifact.metadata,
              request: {
                ...firstStoredArtifact.metadata.request,
                model: "other-image-model",
              },
            },
            provenance: {
              ...firstStoredArtifact.provenance,
              modelOrRuntime: "other-image-model",
            },
          }
        : storedArtifact(artifact),
    );

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_request_model_mismatch",
        deckContextId: "deck_context_001",
        designSystemId: "design_001",
        artifacts,
        storedArtifacts,
        promptPackages: packages,
      }),
    );

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "stored_background_artifact_mismatch",
    ]);
  });
});
