import { describe, expect, test } from "bun:test";
import { buildLiveBackgroundBatch, validateLiveBackgroundBatch } from "./live-background-batch";
import {
  imageArtifact,
  slidePackages,
  storedArtifact,
} from "./live-background-batch-test-fixtures";

describe("live background batch request model evidence", () => {
  test("blocks padded live artifact request metadata before accepting stored evidence", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg, index) => {
      const artifact = imageArtifact(pkg);
      return index === 0
        ? {
            ...artifact,
            request: {
              ...artifact.request,
              requestId: " img_req_001 ",
              model: " gpt-image-2 ",
            },
          }
        : artifact;
    });

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_padded_request_metadata",
        deckContextId: "deck_context_001",
        designSystemId: "design_001",
        artifacts,
        storedArtifacts: artifacts.map((artifact) => storedArtifact(artifact)),
        promptPackages: packages,
      }),
    );

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "missing_provider_request_metadata",
    ]);
  });

  test("blocks blank live artifact request models before accepting stored evidence", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg, index) => {
      const artifact = imageArtifact(pkg);
      return index === 0 ? { ...artifact, request: { ...artifact.request, model: " " } } : artifact;
    });
    const firstStoredArtifact = storedArtifact(artifacts[0]);
    const storedArtifacts = artifacts.map((artifact, index) =>
      index === 0
        ? {
            ...firstStoredArtifact,
            metadata: {
              ...firstStoredArtifact.metadata,
              request: { ...firstStoredArtifact.metadata.request, model: " " },
            },
            provenance: { ...firstStoredArtifact.provenance, modelOrRuntime: " " },
          }
        : storedArtifact(artifact),
    );

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_blank_request_model",
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
      "missing_provider_request_metadata",
    ]);
  });

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
