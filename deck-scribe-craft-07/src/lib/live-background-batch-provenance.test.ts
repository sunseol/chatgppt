import { describe, expect, test } from "bun:test";
import type { StoredSlideImageArtifact } from "./image-artifact-store";
import { buildLiveBackgroundBatch, validateLiveBackgroundBatch } from "./live-background-batch";
import {
  imageArtifact,
  slidePackages,
  storedArtifact,
} from "./live-background-batch-test-fixtures";

describe("live background batch stored provenance", () => {
  test("blocks stored provenance sidecars that drift from the binary and live artifact", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));
    const firstStoredArtifact = storedArtifact(artifacts[0]);
    const storedArtifacts = artifacts.map((artifact, index): StoredSlideImageArtifact => {
      if (index !== 0) return storedArtifact(artifact);
      return {
        ...firstStoredArtifact,
        provenance: {
          ...firstStoredArtifact.provenance,
          artifactId: "project_001_image_slide_099_v1",
          executionMode: "development",
          providerKind: "codex",
          authMode: "local",
          promptVersion: "other_prompt@v1",
          inputArtifactIds: ["sha256:other", "other_layout.png"],
        },
      };
    });

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_stale_provenance_sidecar",
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
