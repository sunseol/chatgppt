import { describe, expect, test } from "bun:test";
import { buildLiveBackgroundBatch, validateLiveBackgroundBatch } from "./live-background-batch";
import {
  imageArtifact,
  slidePackages,
  storedArtifact,
} from "./live-background-batch-test-fixtures";

describe("live background batch storage paths", () => {
  test("blocks stored background artifacts outside versioned project image storage", () => {
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));
    const firstStoredArtifact = storedArtifact(artifacts[0]);
    const storedArtifacts = artifacts.map((artifact, index) =>
      index === 0
        ? {
            ...firstStoredArtifact,
            binary: { ...firstStoredArtifact.binary, path: "fixtures/mock-slide.png" },
          }
        : storedArtifact(artifact),
    );

    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_unversioned_storage_path",
        deckContextId: "deck_context_001",
        designSystemId: "design_001",
        artifacts,
        storedArtifacts,
        promptPackages: packages,
      }),
    );

    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "stored_background_artifact_mismatch",
    ]);
  });
});
