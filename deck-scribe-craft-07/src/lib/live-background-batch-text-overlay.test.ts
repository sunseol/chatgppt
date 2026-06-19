import { describe, expect, test } from "bun:test";
import { buildLiveBackgroundBatch, validateLiveBackgroundBatch } from "./live-background-batch";
import {
  imageArtifact,
  slidePackages,
  storedArtifact,
} from "./live-background-batch-test-fixtures";

describe("live background batch text overlay evidence", () => {
  test("blocks prompt packages whose structured text overlay rules no longer reserve text layers", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));
    const firstPackage = packages[0];
    const promptPackages = packages.map((pkg) =>
      pkg.slideNumber === firstPackage.slideNumber
        ? {
            ...pkg,
            textOverlayStrategy: {
              ...pkg.textOverlayStrategy,
              reservedOverlayLayerIds: [],
              negativePromptRules: pkg.textOverlayStrategy.negativePromptRules.filter(
                (rule) =>
                  rule !== "Do not render exact title, body, metric, chart, or source text.",
              ),
            },
          }
        : pkg,
    );

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_missing_structured_overlay",
        deckContextId: "deck_context_001",
        designSystemId: "design_001",
        artifacts,
        storedArtifacts: artifacts.map((artifact) => storedArtifact(artifact)),
        promptPackages,
      }),
    );

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual(["missing_text_overlay_rule"]);
  });
});
