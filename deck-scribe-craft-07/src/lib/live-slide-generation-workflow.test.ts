import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { createProviderJobManager } from "./provider-job-manager";
import { encodeSolidPngDataUrl } from "./png-encoder";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { createMockSlideImageProvider, createOpenAIImageProvider } from "./slide-image-provider";
import type { OpenAIImageClientRequest } from "./slide-image-provider";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import { runLiveSlideGenerationWorkflow } from "./live-slide-generation-workflow";

describe("live slide generation workflow", () => {
  test("runs OpenAI image generation through stored artifacts and compositor output", async () => {
    const requests: OpenAIImageClientRequest[] = [];
    const writes: ImageArtifactStoreWrite[] = [];
    const project = approvedProject(5);

    const result = await runLiveSlideGenerationWorkflow({
      project,
      provider: createOpenAIImageProvider({
        async generate(request) {
          requests.push(request);
          return {
            imageDataUrl: encodeSolidPngDataUrl({
              width: 2,
              height: 2,
              color: { r: 48, g: 96, b: 144, a: 255 },
            }),
            requestId: `img_req_${String(requests.length).padStart(3, "0")}`,
            size: "1600x900",
            quality: "high",
            latencyMs: 1_200,
          };
        },
      }),
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      manager: createProviderJobManager({ createId: sequentialIds("image_job") }),
      createdAt: 1_789_900_000,
      version: 1,
      maxParallel: 2,
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.slides.map((slide) => slide.status)).toEqual([
      "ready",
      "ready",
      "ready",
      "ready",
      "ready",
    ]);
    expect(result.artifacts.map((artifact) => artifact.providerId)).toEqual([
      "openaiImage",
      "openaiImage",
      "openaiImage",
      "openaiImage",
      "openaiImage",
    ]);
    expect(result.storedArtifacts.map((stored) => stored.binary.path)).toEqual([
      "projects/project_live/slides/images/slide_001.v1.png",
      "projects/project_live/slides/images/slide_002.v1.png",
      "projects/project_live/slides/images/slide_003.v1.png",
      "projects/project_live/slides/images/slide_004.v1.png",
      "projects/project_live/slides/images/slide_005.v1.png",
    ]);
    expect(result.compositions.length).toBe(5);
    expect(result.compositions[0]?.backgroundProviderId).toBe("openaiImage");
    expect(
      /^sha256:[a-f0-9]{64}$/.test(result.compositions[0]?.backgroundArtifact?.hash ?? ""),
    ).toBe(true);
    expect(result.providerLineage.every((item) => item.fixture === false)).toBe(true);
    expect(result.providerLineage.map((item) => item.requestId)).toEqual([
      "img_req_001",
      "img_req_002",
      "img_req_003",
      "img_req_004",
      "img_req_005",
    ]);
    expect(requests.length).toBe(5);
    expect(writes.length).toBe(10);
  });

  test("blocks production workflow when a mock image provider is supplied", async () => {
    const result = await runLiveSlideGenerationWorkflow({
      project: approvedProject(5),
      provider: createMockSlideImageProvider(),
      store: { write: async () => undefined },
      createdAt: 1_789_900_000,
    });

    expect(result).toEqual({
      kind: "blocked",
      issues: [
        {
          code: "mock_provider_not_allowed",
          message: "Production live slide generation cannot use the mock image provider.",
        },
      ],
    });
  });

  test("blocks non-MVP slide counts before sending image requests", async () => {
    const requests: OpenAIImageClientRequest[] = [];

    const result = await runLiveSlideGenerationWorkflow({
      project: approvedProject(4),
      provider: createOpenAIImageProvider({
        async generate(request) {
          requests.push(request);
          return {
            imageDataUrl: encodeSolidPngDataUrl({
              width: 2,
              height: 2,
              color: { r: 48, g: 96, b: 144, a: 255 },
            }),
            requestId: "img_req_should_not_run",
          };
        },
      }),
      store: { write: async () => undefined },
      createdAt: 1_789_900_000,
    });

    expect(result).toEqual({
      kind: "blocked",
      issues: [
        {
          code: "unsupported_slide_count",
          message: "Production MVP image generation requires exactly 5 slides.",
        },
      ],
    });
    expect(requests).toEqual([]);
  });
});

function approvedProject(slideCount: number): DeckProject {
  const brief = {
    ...mockBrief("Live image generation workflow", slideCount, "16:9"),
    id: "brief_live",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_live", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_live", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_live", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), id: "layout_live", approvedHash: "sha256:layout" };
  return {
    id: "project_live",
    name: "Live Image Workflow",
    initialPrompt: "Create a live image deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount,
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
