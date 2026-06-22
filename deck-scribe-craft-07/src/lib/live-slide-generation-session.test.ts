import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { encodeSolidPngDataUrl } from "./png-encoder";
import { createProviderJobManager } from "./provider-job-manager";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import {
  runCodexLiveSlideGenerationSession,
  type CodexLiveSlideGenerationClientRequest,
} from "./live-slide-generation-session";

describe("Codex live slide generation session", () => {
  test("stores Codex OAuth images for every approved slide through the live queue", async () => {
    // Given
    const requests: CodexLiveSlideGenerationClientRequest[] = [];
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const result = await runCodexLiveSlideGenerationSession({
      project: approvedProject(),
      client: {
        async generate(request) {
          requests.push(request);
          return {
            imageDataUrl: encodeSolidPngDataUrl({
              width: 1,
              height: 1,
              color: { r: 24, g: 80, b: 120, a: 255 },
            }),
            model: "gpt-image-2",
            runtime: "codex_app_server",
            threadId: `thread_live_image_${requests.length}`,
            turnId: `turn_live_image_${requests.length}`,
            latencyMs: 1_200 + requests.length,
            usage: { imageCount: 1 },
          };
        },
      },
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      manager: createProviderJobManager({ createId: sequentialIds("job_codex_slide") }),
      maxParallel: 1,
      now: clock(1_789_900_000),
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.status).toBe("succeeded");
    expect(result.slides.map((slide) => slide.imageDescriptor)).toEqual([
      "codex|16:9|slide_01_layout.png|slide_generation@v1",
      "codex|16:9|slide_02_layout.png|slide_generation@v1",
    ]);
    expect(requests.map((request) => request.layoutReference.screenshot)).toEqual([
      "slide_01_layout.png",
      "slide_02_layout.png",
    ]);
    expect(writes.map((write) => write.path)).toEqual([
      "projects/project_001/slides/images/slide_001.v1.png",
      "projects/project_001/slides/images/slide_001.v1.metadata.json",
      "projects/project_001/slides/images/slide_001.v1.provenance.json",
      "projects/project_001/slides/images/slide_002.v1.png",
      "projects/project_001/slides/images/slide_002.v1.metadata.json",
      "projects/project_001/slides/images/slide_002.v1.provenance.json",
    ]);
    expect(result.jobs.every((job) => job.providerId === "codex")).toBe(true);
  });

  test("blocks before Codex image calls when the frozen deck context is incomplete", async () => {
    // Given
    const requests: CodexLiveSlideGenerationClientRequest[] = [];

    // When
    const result = await runCodexLiveSlideGenerationSession({
      project: { ...approvedProject(), layout: undefined },
      client: {
        async generate(request) {
          requests.push(request);
          throw new Error("Provider must not run without approved layout.");
        },
      },
      store: { write: async () => undefined },
      now: clock(1_789_900_000),
    });

    // Then
    expect(result).toEqual({
      kind: "blocked",
      issues: ["Approved layout prototype is required."],
    });
    expect(requests).toEqual([]);
  });

  test("does not store a late Codex image after cancellation is requested", async () => {
    // Given
    const requests: CodexLiveSlideGenerationClientRequest[] = [];
    const writes: ImageArtifactStoreWrite[] = [];
    let cancelRequested = false;

    // When
    const result = await runCodexLiveSlideGenerationSession({
      project: approvedProject(),
      client: {
        async generate(request) {
          requests.push(request);
          cancelRequested = true;
          return {
            imageDataUrl: encodeSolidPngDataUrl({
              width: 1,
              height: 1,
              color: { r: 120, g: 40, b: 80, a: 255 },
            }),
            model: "gpt-image-2",
            runtime: "codex_app_server",
            threadId: "thread_late_cancel",
            turnId: "turn_late_cancel",
            latencyMs: 4_200,
            usage: { imageCount: 1 },
          };
        },
      },
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      manager: createProviderJobManager({ createId: sequentialIds("job_codex_cancel") }),
      maxParallel: 1,
      isCancellationRequested: () => cancelRequested,
      now: clock(1_789_900_000),
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.status).toBe("failed");
    expect(result.slides).toEqual([]);
    expect(result.failures.every((failure) => failure.failureKind === "cancelled")).toBe(true);
    expect(result.jobs.every((job) => job.status === "cancelled")).toBe(true);
    expect(requests.length).toBe(1);
    expect(writes).toEqual([]);
  });
});

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Codex live generation", 2, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), id: "layout_001", approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Codex Live Generation",
    initialPrompt: "Create a live deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 2,
    stage: "GENERATING_SLIDES",
    createdAt: 1_789_900_000,
    updatedAt: 1_789_900_000,
    brief,
    research,
    plan,
    design,
    layout,
    invalidated: {},
    approvalLog: [],
  };
}

function sequentialIds(prefix: string): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `${prefix}_${next}`;
  };
}

function clock(start: number): () => number {
  let next = start;
  return () => {
    next += 1;
    return next;
  };
}
