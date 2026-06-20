import { describe, expect, test } from "bun:test";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import { createLiveSlideRegenerationCandidate } from "./live-slide-regeneration";
import {
  approvedSlideFixture,
  liveRegenerationRequestFixture,
  slideImageArtifactFixture,
  slideSpecFixture,
} from "./live-slide-regeneration-test-fixtures";

describe("live full-slide regeneration slide spec lineage", () => {
  test("blocks regenerated candidates produced from a stale slide spec", async () => {
    const store = createImageArtifactStore({ write: async () => undefined });
    const candidateBackground = await storeSlideImageArtifact({
      store,
      projectId: "project_001",
      artifact: slideImageArtifactFixture(),
      version: 2,
      createdAt: 1_789_900_018,
    });

    const result = createLiveSlideRegenerationCandidate({
      request: liveRegenerationRequestFixture({ slideSpec: slideSpecFixture() }),
      originalSlide: approvedSlideFixture(),
      candidateBackground,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateSlideSpec: { ...slideSpecFixture(), title: "오래된 제목" },
      candidateVersion: 2,
    });

    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") return;
    expect(result.failure.issues.map((issue) => issue.code)).toEqual(["slide_spec_mismatch"]);
    expect(result.preservedSlide).toEqual(approvedSlideFixture());
  });
});
