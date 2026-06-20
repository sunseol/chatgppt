import { describe, expect, test } from "bun:test";
import { createImageArtifactStore, storeSlideImageArtifact } from "./image-artifact-store";
import {
  buildLiveSlideRegenerationRequest,
  createLiveSlideRegenerationCandidate,
} from "./live-slide-regeneration";
import {
  approvedSlideFixture,
  revisionRequestFixture,
  slideImageArtifactFixture,
  slideSpecFixture,
} from "./live-slide-regeneration-test-fixtures";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("live full-slide regeneration", () => {
  test("builds a request that preserves slide spec, deck context, and design system identity", () => {
    // Given
    const revisionRequest = revisionRequestFixture();

    // When
    const result = buildLiveSlideRegenerationRequest({
      revisionRequest,
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: "project_001_image_slide_003_v1",
      originalBackgroundRequestId: "img_req_original",
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.request.deckContextId).toBe("deckctx_001");
    expect(result.request.designSystemId).toBe("design_001");
    expect(result.request.mustKeep.includes("title text")).toBe(true);
    expect(result.request.mustKeep.includes("chart area size")).toBe(false);
    expect(result.request.mustChange).toEqual(["chart area size"]);
    expect(result.request.originalBackgroundArtifactId).toBe("project_001_image_slide_003_v1");
    expect(result.request.originalBackgroundRequestId).toBe("img_req_original");
    expect(result.request.slideSpecHash.startsWith("sha256:")).toBe(true);
  });

  test("blocks regeneration requests without explicit keep, change, and original background evidence", () => {
    // Given
    const revisionRequest = {
      ...revisionRequestFixture(),
      mustKeep: ["title text"],
      mustChange: ["title text"],
    };

    // When
    const result = buildLiveSlideRegenerationRequest({
      revisionRequest,
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: "",
      originalBackgroundRequestId: "",
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code).join("|")).toBe(
      "revision_targets_overlap|missing_original_background_artifact|missing_original_background_request",
    );
  });

  test("blocks regeneration requests with empty keep and change targets", () => {
    // Given
    const revisionRequest = { ...revisionRequestFixture(), mustKeep: [], mustChange: [] };

    // When
    const result = buildLiveSlideRegenerationRequest({
      revisionRequest,
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: "project_001_image_slide_003_v1",
      originalBackgroundRequestId: "img_req_original",
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code).join("|")).toBe(
      "missing_must_keep_targets|missing_must_change_targets",
    );
  });

  test("blocks regeneration requests with blank target entries", () => {
    // Given
    const revisionRequest = {
      ...revisionRequestFixture(),
      mustKeep: ["title text", "  "],
      mustChange: ["chart area size"],
    };

    // When
    const result = buildLiveSlideRegenerationRequest({
      revisionRequest,
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: "project_001_image_slide_003_v1",
      originalBackgroundRequestId: "img_req_original",
    });

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["blank_revision_target"]);
  });

  test("stores a new background artifact version and keeps the approved slide until approval", async () => {
    // Given
    const stored = await storedBackgrounds();
    const requestResult = buildLiveSlideRegenerationRequest({
      revisionRequest: revisionRequestFixture(),
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: stored.original.binary.artifactId,
      originalBackgroundRequestId: stored.originalRequestId,
    });
    if (requestResult.kind !== "ready") throw new Error("Expected live regeneration request.");
    const originalSlides = [approvedSlideFixture()];

    // When
    const candidateResult = createLiveSlideRegenerationCandidate({
      request: requestResult.request,
      originalSlide: approvedSlideFixture(),
      candidateBackground: stored.candidate,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateSlideSpec: slideSpecFixture(),
      candidateVersion: 2,
    });

    // Then
    expect(candidateResult.kind).toBe("ready");
    if (candidateResult.kind !== "ready") return;
    expect(originalSlides[0]).toEqual(approvedSlideFixture());
    expect(candidateResult.candidate.slide.status).toBe("ready");
    expect(candidateResult.candidate.slide.version).toBe(2);
    expect(candidateResult.candidate.originalBackgroundArtifactId).toBe(
      "project_001_image_slide_003_v1",
    );
    expect(candidateResult.candidate.backgroundArtifactId).toBe("project_001_image_slide_003_v2");
    expect(candidateResult.candidate.mustKeep.includes("title text")).toBe(true);
    expect(candidateResult.candidate.mustChange).toEqual(["chart area size"]);

    expect(
      candidateResult.candidate.afterImageDescriptor.includes("project_001_image_slide_003_v2"),
    ).toBe(true);
  });

  test("blocks invalid candidates and preserves the existing approved slide", async () => {
    // Given
    const stored = await storedBackgrounds({ candidateProviderId: "mock" });
    const requestResult = buildLiveSlideRegenerationRequest({
      revisionRequest: revisionRequestFixture(),
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: stored.original.binary.artifactId,
      originalBackgroundRequestId: stored.originalRequestId,
    });
    if (requestResult.kind !== "ready") throw new Error("Expected live regeneration request.");

    // When
    const candidateResult = createLiveSlideRegenerationCandidate({
      request: requestResult.request,
      originalSlide: approvedSlideFixture(),
      candidateBackground: stored.candidate,
      candidateDeckContextId: "deckctx_999",
      candidateDesignSystemId: "design_001",
      candidateSlideSpec: slideSpecFixture(),
      candidateVersion: 2,
    });

    // Then
    expect(candidateResult.kind).toBe("failed");
    if (candidateResult.kind !== "failed") return;
    expect(candidateResult.preservedSlide).toEqual(approvedSlideFixture());
    expect(candidateResult.failure.issues.map((issue) => issue.code)).toEqual([
      "deck_context_mismatch",
      "mock_background_artifact",
      "missing_regeneration_request_id",
    ]);
  });

  test("blocks candidates that reuse the approved original background artifact", async () => {
    // Given
    const stored = await storedBackgrounds({ reuseOriginalAsCandidate: true });
    const requestResult = buildLiveSlideRegenerationRequest({
      revisionRequest: revisionRequestFixture(),
      deckContextId: "deckctx_001",
      designSystemId: "design_001",
      slideSpec: slideSpecFixture(),
      currentSlide: approvedSlideFixture(),
      originalBackgroundArtifactId: stored.original.binary.artifactId,
      originalBackgroundRequestId: stored.originalRequestId,
    });
    if (requestResult.kind !== "ready") throw new Error("Expected live regeneration request.");

    // When
    const candidateResult = createLiveSlideRegenerationCandidate({
      request: requestResult.request,
      originalSlide: approvedSlideFixture(),
      candidateBackground: stored.candidate,
      candidateDeckContextId: "deckctx_001",
      candidateDesignSystemId: "design_001",
      candidateSlideSpec: slideSpecFixture(),
      candidateVersion: 2,
    });

    // Then
    expect(candidateResult.kind).toBe("failed");
    if (candidateResult.kind !== "failed") return;
    expect(candidateResult.preservedSlide).toEqual(approvedSlideFixture());
    expect(candidateResult.failure.issues.map((issue) => issue.code)).toEqual([
      "background_artifact_not_new",
    ]);
  });
});

async function storedBackgrounds(
  options: {
    readonly candidateProviderId?: SlideImageArtifact["providerId"];
    readonly reuseOriginalAsCandidate?: boolean;
  } = {},
) {
  const store = createImageArtifactStore({ write: async () => undefined });
  const originalRequestId = "img_req_original";
  const original = await storeSlideImageArtifact({
    store,
    projectId: "project_001",
    artifact: slideImageArtifactFixture({ requestId: originalRequestId }),
    version: 1,
    createdAt: 1_789_900_001,
  });
  const candidateStored = options.reuseOriginalAsCandidate
    ? original
    : await storeSlideImageArtifact({
        store,
        projectId: "project_001",
        artifact: slideImageArtifactFixture({
          requestId: "img_req_revised",
        }),
        version: 2,
        createdAt: 1_789_900_002,
      });
  const candidate =
    options.candidateProviderId === undefined || options.candidateProviderId === "openaiImage"
      ? candidateStored
      : {
          ...candidateStored,
          metadata: { ...candidateStored.metadata, providerId: options.candidateProviderId },
          provenance: { ...candidateStored.provenance, providerKind: options.candidateProviderId },
        };
  return { original, candidate, originalRequestId };
}
