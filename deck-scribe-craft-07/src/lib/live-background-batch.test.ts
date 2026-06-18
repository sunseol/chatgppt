import { describe, expect, test } from "bun:test";
import {
  buildLiveBackgroundBatch,
  getRetryableBackgroundSlideNumbers,
  validateLiveBackgroundBatch,
} from "./live-background-batch";
import { encodeSolidPngDataUrl } from "./png-encoder";
import type { StoredSlideImageArtifact } from "./image-artifact-store";
import type { SlidePromptPackage } from "./slide-prompt-package";
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
          { ...packages[2], designSystemId: "other_design" },
          { ...packages[3], prompt: packages[3].prompt.replace("Do not render exact title", "") },
          packages[4],
        ],
      }),
    );

    // Then
    expect(validation.kind).toBe("blocked");
    if (validation.kind !== "blocked") return;
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      "mock_provider_output",
      "wrong_aspect_ratio",
      "deck_context_mismatch",
      "slide_id_mismatch",
      "design_system_mismatch",
      "layout_reference_mismatch",
      "missing_text_overlay_rule",
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
});

function slidePackages(): SlidePromptPackage[] {
  return [1, 2, 3, 4, 5].map((slideNumber) => ({
    promptId: "slide_generation",
    promptVersion: "v1",
    promptHash: "sha256:prompt",
    bundleId: `bundle_${slideNumber}`,
    deckContextId: "deck_context_001",
    deckContextHash: "sha256:context",
    designSystemId: "design_001",
    slideNumber,
    layoutScreenshot: `slide_${String(slideNumber).padStart(2, "0")}_layout.png`,
    sourceMapIds: [],
    textOverlayStrategy: {
      bundleId: `bundle_${slideNumber}`,
      deckContextId: "deck_context_001",
      deckContextHash: "sha256:context",
      slideNumber,
      layoutScreenshot: `slide_${String(slideNumber).padStart(2, "0")}_layout.png`,
      reservedOverlayLayerIds: ["title", "body", "chart", "source"],
      generatedBackgroundLayerIds: ["background"],
      layers: [],
      negativePromptRules: [
        "Do not render exact title, body, metric, chart, or source text.",
        "Do not invent numbers, logos, citations, charts, or source captions.",
      ],
    },
    prompt: [
      "Deck Context ID: deck_context_001",
      "Design System ID: design_001",
      "Do not render exact title, body, metric, chart, or source text",
      "Layout screenshot composition reference",
    ].join("\n"),
  }));
}

function imageArtifact(pkg: SlidePromptPackage): SlideImageArtifact {
  return {
    providerId: "openaiImage",
    slideNumber: pkg.slideNumber,
    aspectRatio: "16:9",
    canvas: { width: 1600, height: 900 },
    layoutReference: {
      screenshot: pkg.layoutScreenshot,
      mode: "composition-reference",
    },
    imageDataUrl: encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 20, g: 40, b: 60, a: 255 },
    }),
    prompt: {
      id: "slide_generation",
      version: "v1",
      hash: "sha256:prompt",
    },
    request: {
      model: "gpt-image-2",
      requestId: `img_req_${String(pkg.slideNumber).padStart(3, "0")}`,
    },
    generatedAt: 1_789_900_000 + pkg.slideNumber,
  };
}

function storedArtifact(artifact: SlideImageArtifact): StoredSlideImageArtifact {
  const request = artifact.request;
  if (!request) throw new Error("Expected request metadata.");
  return {
    binary: {
      artifactId: `project_001_image_slide_${String(artifact.slideNumber).padStart(3, "0")}_v1`,
      path: `projects/project_001/slides/images/slide_${String(artifact.slideNumber).padStart(3, "0")}.v1.png`,
      hash: `sha256:${"a".repeat(64)}`,
      bytes: 70,
      createdAt: 1_789_900_100 + artifact.slideNumber,
    },
    metadata: {
      path: `projects/project_001/slides/images/slide_${String(artifact.slideNumber).padStart(3, "0")}.v1.metadata.json`,
      providerId: artifact.providerId,
      slideNumber: artifact.slideNumber,
      aspectRatio: artifact.aspectRatio,
      canvas: artifact.canvas,
      layoutReference: artifact.layoutReference,
      prompt: artifact.prompt,
      request,
      generatedAt: artifact.generatedAt,
    },
    provenance: {
      artifactId: `project_001_image_slide_${String(artifact.slideNumber).padStart(3, "0")}_v1`,
      executionMode: "production",
      providerKind: artifact.providerId,
      authMode: artifact.providerId === "openaiImage" ? "api_key" : "codex_session",
      modelOrRuntime: request.model,
      promptVersion: `${artifact.prompt.id}@${artifact.prompt.version}`,
      durationMs: request.latencyMs ?? 0,
      inputArtifactIds: [artifact.prompt.hash, artifact.layoutReference.screenshot],
      fixture: false,
      ...(request.requestId === undefined ? {} : { requestId: request.requestId }),
    },
  };
}
