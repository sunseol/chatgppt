import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import { encodeSolidPngDataUrl } from "./png-encoder";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import {
  runCodexLiveSlideRegenerationSession,
  type CodexLiveSlideRegenerationClientRequest,
} from "./live-slide-regeneration-session";

describe("Codex live slide regeneration session", () => {
  test("stores a Codex OAuth regeneration candidate while preserving the approved original slide", async () => {
    // Given
    const requests: CodexLiveSlideRegenerationClientRequest[] = [];
    const writes: ImageArtifactStoreWrite[] = [];
    const project = approvedProject();

    // When
    const result = await runCodexLiveSlideRegenerationSession({
      project,
      slideNumber: 1,
      instruction: "오른쪽 차트를 더 크게 만들어줘.",
      originalBackground: {
        artifactId: "project_001_image_slide_001_v1",
        providerRunId: "turn_codex_image_original",
      },
      client: {
        async generate(request) {
          requests.push(request);
          return {
            imageDataUrl: encodeSolidPngDataUrl({
              width: 1,
              height: 1,
              color: { r: 28, g: 68, b: 128, a: 255 },
            }),
            model: "gpt-image-2",
            runtime: "codex_app_server",
            threadId: "thread_codex_regeneration_001",
            turnId: "turn_codex_regeneration_001",
            latencyMs: 1_450,
            usage: { imageCount: 1 },
          };
        },
      },
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      now: clock(1_789_920_000),
      createId: () => "rev_codex_slide_001",
    });

    // Then
    expect(project.slides?.[0]?.status).toBe("approved");
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.candidate.slide.status).toBe("ready");
    expect(result.candidate.slide.version).toBe(2);
    expect(result.candidate.originalBackgroundArtifactId).toBe("project_001_image_slide_001_v1");
    expect(result.candidate.backgroundArtifactId).toBe("project_001_image_slide_001_v2");
    expect(result.comparison.beforeImageDescriptor).toBe(
      "codex|16:9|slide_01_layout.png|slide_generation@v1",
    );
    expect(result.stored.provenance.turnId).toBe("turn_codex_regeneration_001");
    expect(
      result.stored.provenance.inputArtifactIds.includes("project_001_image_slide_001_v1"),
    ).toBe(true);
    expect(requests[0]?.prompt.includes("[FULL SLIDE REGENERATION REQUEST]")).toBe(true);
    expect(requests[0]?.prompt.includes("rev_codex_slide_001")).toBe(true);
    expect(writes.map((write) => write.path)).toEqual([
      "projects/project_001/slides/images/slide_001.v2.png",
      "projects/project_001/slides/images/slide_001.v2.metadata.json",
      "projects/project_001/slides/images/slide_001.v2.provenance.json",
    ]);
  });
});

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Codex live regeneration", 1, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), id: "layout_001", approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Codex Live Regeneration",
    initialPrompt: "Create a live deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "SLIDE_REVIEW_PENDING",
    createdAt: 1_789_920_000,
    updatedAt: 1_789_920_000,
    brief,
    research,
    plan,
    design,
    layout,
    slides: [
      {
        number: 1,
        version: 1,
        status: "approved",
        imageDescriptor: "codex|16:9|slide_01_layout.png|slide_generation@v1",
        notes: "projects/project_001/slides/images/slide_001.v1.png",
      },
    ],
    invalidated: {},
    approvalLog: [],
  };
}

function clock(start: number): () => number {
  let next = start;
  return () => {
    next += 1;
    return next;
  };
}
