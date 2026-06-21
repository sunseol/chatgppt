import { describe, expect, test } from "bun:test";
import type { DeckProject, GeneratedSlide } from "@/lib/deck-types";
import { encodeSolidPngDataUrl } from "@/lib/png-encoder";
import { createProviderJobManager, type ProviderJob } from "@/lib/provider-job-manager";
import type { ImageArtifactStoreWrite } from "@/lib/image-artifact-store";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "@/lib/mock-ai";
import { runCodexGenerateStageJob } from "./generate-stage-codex-runner";

describe("generate stage Codex runner", () => {
  test("runs a Codex live image session through the outer generate job", async () => {
    // Given
    const manager = createProviderJobManager({ createId: sequentialIds("job_generate") });
    const queued = manager.enqueue({
      providerId: "codex",
      capability: "imageGeneration",
      description: "Generate Codex slides",
    });
    const reportedJobs: ProviderJob[] = [];
    const slideUpdates: GeneratedSlide[][] = [];
    const writes: ImageArtifactStoreWrite[] = [];

    // When
    const completed = await runCodexGenerateStageJob({
      project: approvedProject(),
      jobId: queued.id,
      manager,
      client: {
        async generate() {
          return {
            imageDataUrl: encodeSolidPngDataUrl({
              width: 1,
              height: 1,
              color: { r: 30, g: 70, b: 110, a: 255 },
            }),
            model: "gpt-image-2",
            runtime: "codex app-server --stdio",
            threadId: "thread_live_image",
            turnId: "turn_live_image",
            latencyMs: 1_200,
            usage: { imageCount: 1 },
          };
        },
      },
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      onJob: (job) => reportedJobs.push(job),
      onSlides: (slides) => slideUpdates.push([...slides]),
      onProgress: () => undefined,
      now: clock(1_789_910_000),
    });

    // Then
    expect(completed.status).toBe("succeeded");
    expect(completed.output?.map((slide) => slide.imageDescriptor)).toEqual([
      "codex|16:9|slide_01_layout.png|slide_generation@v1",
      "codex|16:9|slide_02_layout.png|slide_generation@v1",
    ]);
    expect(slideUpdates[0]?.every((slide) => slide.status === "generating")).toBe(true);
    expect(slideUpdates.at(-1)?.every((slide) => slide.status === "ready")).toBe(true);
    expect(writes.map((write) => write.path)).toEqual([
      "projects/project_001/slides/images/slide_001.v1.png",
      "projects/project_001/slides/images/slide_001.v1.metadata.json",
      "projects/project_001/slides/images/slide_001.v1.provenance.json",
      "projects/project_001/slides/images/slide_002.v1.png",
      "projects/project_001/slides/images/slide_002.v1.metadata.json",
      "projects/project_001/slides/images/slide_002.v1.provenance.json",
      "projects/project_001/live-evidence/df233-image-queue-job_generate_1.json",
    ]);
    const evidenceContent = writes.at(-1)?.content;
    if (typeof evidenceContent !== "string") throw new Error("Expected queue evidence JSON.");
    expect(evidenceContent.includes('"issue": "DF-233"')).toBe(true);
    expect(evidenceContent.includes('"resultStatus": "succeeded"')).toBe(true);
    expect(evidenceContent.includes("projects/project_001/slides/images/slide_001.v1.png")).toBe(
      true,
    );
    expect(evidenceContent.includes("projects/project_001/slides/images/slide_002.v1.png")).toBe(
      true,
    );
    expect(completed.partialResult).toEqual({
      kind: "live_slide_images",
      label: "2 Codex slide images",
      artifactId: "project_001",
      queueEvidencePath: "projects/project_001/live-evidence/df233-image-queue-job_generate_1.json",
    });
    expect(reportedJobs.some((job) => job.progress?.percent === 100)).toBe(true);
  });
});

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Generate stage Codex runner", 2, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), id: "layout_001", approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Generate Codex Runner",
    initialPrompt: "Create a live deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 2,
    stage: "GENERATING_SLIDES",
    createdAt: 1_789_910_000,
    updatedAt: 1_789_910_000,
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
