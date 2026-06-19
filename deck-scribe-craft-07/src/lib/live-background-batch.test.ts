import { describe, expect, test } from "bun:test";
import {
  buildLiveBackgroundBatch,
  getRetryableBackgroundSlideNumbers,
  validateLiveBackgroundBatch,
} from "./live-background-batch";
import {
  imageArtifact,
  slidePackages,
  storedArtifact,
} from "./live-background-batch-test-fixtures";
import type { SlideImageArtifact } from "./slide-image-provider";

describe("live background batch", () => {
  test("accepts exactly five live 16:9 background artifacts with shared context and design system", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));
    const storedArtifacts = artifacts.map((artifact) => storedArtifact(artifact));

    // When
    const batch = buildLiveBackgroundBatch({
      batchId: "live_bg_batch_001",
      deckContextId: "deck_context_001",
      designSystemId: "design_001",
      artifacts,
      storedArtifacts,
      promptPackages: packages,
    });
    const validation = validateLiveBackgroundBatch(batch);

    // Then
    expect(validation).toEqual({ kind: "ready" });
    expect(
      batch.artifacts.map((artifact) => artifact.providerId).every((id) => id === "openaiImage"),
    ).toBe(true);
    expect(batch.artifacts.map((artifact) => artifact.slideNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  test("blocks mock output, wrong context, missing overlay rule, and slide mismatch", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));
    const badArtifacts: readonly SlideImageArtifact[] = [
      { ...artifacts[0], providerId: "mock" },
      { ...artifacts[1], aspectRatio: "4:3" },
      { ...artifacts[2], slideNumber: 99 },
      {
        ...artifacts[3],
        layoutReference: { screenshot: "wrong.png", mode: "composition-reference" },
      },
      artifacts[4],
    ];

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_bad",
        deckContextId: "deck_context_001",
        designSystemId: "design_001",
        artifacts: badArtifacts,
        storedArtifacts: badArtifacts.map((artifact) => storedArtifact(artifact)),
        promptPackages: [
          packages[0],
          { ...packages[1], deckContextId: "other_context" },
          packages[2],
          { ...packages[3], prompt: packages[3].prompt.replace("Do not render exact title", "") },
          { ...packages[4], designSystemId: "other_design" },
        ],
      }),
    );

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "slide_id_mismatch",
      "mock_provider_output",
      "wrong_aspect_ratio",
      "deck_context_mismatch",
      "missing_prompt_package",
      "layout_reference_mismatch",
      "missing_text_overlay_rule",
      "design_system_mismatch",
    ]);
  });

  test("blocks batches without stored background artifact evidence", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_missing_storage",
        deckContextId: "deck_context_001",
        designSystemId: "design_001",
        artifacts,
        promptPackages: packages,
      }),
    );

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "missing_stored_background_artifact",
      "missing_stored_background_artifact",
      "missing_stored_background_artifact",
      "missing_stored_background_artifact",
      "missing_stored_background_artifact",
    ]);
  });

  test("accepts stored background artifacts matched by slide number instead of array order", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));
    const storedArtifacts = [...artifacts.map((artifact) => storedArtifact(artifact))].reverse();

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_shuffled_storage",
        deckContextId: "deck_context_001",
        designSystemId: "design_001",
        artifacts,
        storedArtifacts,
        promptPackages: packages,
      }),
    );

    // Then
    expect(validation).toEqual({ kind: "ready" });
  });

  test("blocks extra prompt packages or stored artifacts beyond the five-slide bundle", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));
    const storedArtifacts = artifacts.map((artifact) => storedArtifact(artifact));

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_extra_evidence",
        deckContextId: "deck_context_001",
        designSystemId: "design_001",
        artifacts,
        storedArtifacts: [...storedArtifacts, storedArtifacts[0]],
        promptPackages: [...packages, packages[0]],
      }),
    );

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    const issueCodes = validation.issues.map((issue) => issue.code);
    expect(issueCodes.includes("prompt_package_count_mismatch")).toBe(true);
    expect(issueCodes.includes("stored_artifact_count_mismatch")).toBe(true);
  });

  test("reports only failed slide numbers as retryable", () => {
    // Given
    const retryable = getRetryableBackgroundSlideNumbers({
      kind: "ready",
      status: "partial_failure",
      context: {
        deckContextId: "deck_context_001",
        deckContextHash: "sha256:context",
        designSystemId: "design_001",
        designTokenHash: "sha256:design",
        layoutPrototypeId: "layout_001",
        slideCount: 5,
      },
      slides: [],
      failures: [
        {
          jobId: "job_003",
          bundleId: "bundle_003",
          slideNumber: 3,
          retryable: true,
          attempts: 1,
          failureKind: "server",
          retryDelaysMs: [500],
          errorMessage: "rate limited",
          userMessage: "retry slide 3",
        },
      ],
      jobs: [],
      promptUsages: [],
      retryProvenance: [],
      progress: { completed: 4, failed: 1, total: 5, percent: 100 },
    });

    // Then
    expect(retryable).toEqual([3]);
  });

  test("blocks fake PNG payloads and missing provider request metadata", () => {
    // Given
    const packages = slidePackages();
    const artifacts = packages.map((pkg) => imageArtifact(pkg));
    const badArtifacts: readonly SlideImageArtifact[] = [
      { ...artifacts[0], imageDataUrl: "data:image/png;base64,ZmFrZQ==" },
      { ...artifacts[1], request: undefined },
      artifacts[2],
      artifacts[3],
      artifacts[4],
    ];

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_unverified_binary",
        deckContextId: "deck_context_001",
        designSystemId: "design_001",
        artifacts: badArtifacts,
        storedArtifacts: artifacts.map((artifact) => storedArtifact(artifact)),
        promptPackages: packages,
      }),
    );

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "invalid_image_binary",
      "missing_provider_request_metadata",
    ]);
  });

  test("blocks stored background evidence from a different provider request", () => {
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
              request: { ...firstStoredArtifact.metadata.request, requestId: "img_req_other" },
            },
            provenance: { ...firstStoredArtifact.provenance, requestId: "img_req_other" },
          }
        : storedArtifact(artifact),
    );

    // When
    const validation = validateLiveBackgroundBatch(
      buildLiveBackgroundBatch({
        batchId: "live_bg_batch_request_mismatch",
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
