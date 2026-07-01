import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { encodeSolidPngDataUrl } from "./png-encoder";
import {
  runProductionImageGenerationFlow,
  runProductionSlideRegenerationFlow,
} from "./production-image-generation-flow";
import type { ImageArtifactStoreWrite } from "./image-artifact-store";
import { createOpenAIImageProvider, type OpenAIImageClientRequest } from "./slide-image-provider";

const NOW = 1_789_900_000;

describe("production image generation flow", () => {
  test("generates and stores five live image artifacts from approved slide context", async () => {
    // Given
    const project = approvedProject();
    const requests: OpenAIImageClientRequest[] = [];
    const writes: ImageArtifactStoreWrite[] = [];
    const provider = createOpenAIImageProvider({
      async generate(request) {
        requests.push(request);
        return {
          imageDataUrl: encodeSolidPngDataUrl({
            width: 1,
            height: 1,
            color: { r: 40 + requests.length, g: 80, b: 120, a: 255 },
          }),
          requestId: `img_req_live_${String(requests.length).padStart(3, "0")}`,
          size: "1600x900",
          quality: "high",
          latencyMs: 1_200 + requests.length,
          usage: { imageCount: 1, estimatedCostUsd: 0.08 },
        };
      },
    });

    // When
    const result = await runProductionImageGenerationFlow({
      project,
      provider,
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      now: () => NOW,
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.batchValidation).toEqual({ kind: "ready" });
    expect(result.slides.map((slide) => slide.number)).toEqual([1, 2, 3, 4, 5]);
    expect(result.slides.every((slide) => slide.status === "ready")).toBe(true);
    expect(result.artifacts.map((artifact) => artifact.providerId)).toEqual([
      "openaiImage",
      "openaiImage",
      "openaiImage",
      "openaiImage",
      "openaiImage",
    ]);
    expect(result.storedArtifacts.map((stored) => stored.binary.path)).toEqual([
      "projects/project_image_flow/slides/images/slide_001.v1.png",
      "projects/project_image_flow/slides/images/slide_002.v1.png",
      "projects/project_image_flow/slides/images/slide_003.v1.png",
      "projects/project_image_flow/slides/images/slide_004.v1.png",
      "projects/project_image_flow/slides/images/slide_005.v1.png",
    ]);
    expect(requests.length).toBe(5);
    expect(requests[0]?.layoutReference).toEqual({
      screenshot: "slide_01_layout.png",
      mode: "composition-reference",
    });
    const contractIds = result.promptPackages.map((pkg) => pkg.designConsistency.contractId);
    expect(new Set(contractIds).size).toBe(1);
    expect(result.designConsistencyValidation).toEqual({ kind: "ready" });
    expect(result.promptPackages[0]?.outputKind).toBe("full_presentation_slide");
    expect(requests[0]?.prompt.includes("[DESIGN CONSISTENCY CONTRACT]")).toBe(true);
    expect(requests[0]?.prompt.includes("Output kind: full_presentation_slide")).toBe(true);
    expect(requests[0]?.prompt.includes("Header/footer template is locked across all slides")).toBe(true);
    expect(requests[0]?.prompt.includes("Card component rules are locked across all slides")).toBe(true);
    expect(requests[0]?.prompt.includes("Icon family and stroke weight are locked across all slides")).toBe(true);
    expect(requests[0]?.slideControlSpec).toEqual(result.promptPackages[0]?.slideControlSpec);
    expect(requests[0]?.slideControlSpec?.outputKind).toBe("full_presentation_slide");
    const mustAvoid = requests[0]?.slideControlSpec?.mustAvoid ?? [];
    expect(mustAvoid.includes("cropped_text")).toBe(true);
    expect(mustAvoid.includes("fake_microcopy")).toBe(true);
    expect(mustAvoid.includes("region_intrusion")).toBe(true);
    expect(result.artifacts[0]?.request?.slideControlSpec).toEqual(result.promptPackages[0]?.slideControlSpec);
    expect(writes.length).toBe(10);
    expect(result.projectPatch).toEqual({
      slides: result.slides,
      stage: "SLIDE_REVIEW_PENDING",
    });
  });

  test("regenerates one selected slide as a new background artifact version", async () => {
    // Given
    const project = approvedProject();
    const requests: OpenAIImageClientRequest[] = [];
    const writes: ImageArtifactStoreWrite[] = [];
    const provider = createOpenAIImageProvider({
      async generate(request) {
        requests.push(request);
        return {
          imageDataUrl: encodeSolidPngDataUrl({
            width: 1,
            height: 1,
            color: { r: 40 + requests.length, g: 80, b: 120, a: 255 },
          }),
          requestId: `img_req_live_${String(requests.length).padStart(3, "0")}`,
          size: "1600x900",
          quality: "high",
          latencyMs: 1_200 + requests.length,
          usage: { imageCount: 1, estimatedCostUsd: 0.08 },
        };
      },
    });
    const store = {
      write: async (entry: ImageArtifactStoreWrite) => {
        writes.push(entry);
      },
    };
    const initial = await runProductionImageGenerationFlow({
      project,
      provider,
      store,
      now: () => NOW,
    });
    if (initial.kind !== "ready") throw new Error("Expected initial image generation to pass.");

    // When
    const regenerated = await runProductionSlideRegenerationFlow({
      project: { ...project, ...initial.projectPatch },
      provider,
      store,
      storedArtifacts: initial.storedArtifacts,
      slideNumber: 3,
      instruction: "배경을 더 역동적인 도심 러닝 장면으로 바꿔줘.",
      now: () => NOW + 1,
      createRevisionId: () => "rev_slide_003_dynamic_city_run",
    });

    // Then
    expect(regenerated.kind).toBe("ready");
    if (regenerated.kind !== "ready") return;
    expect(requests.length).toBe(6);
    expect(requests[5]?.prompt.includes("배경을 더 역동적인 도심 러닝 장면으로 바꿔줘.")).toBe(true);
    expect(regenerated.storedArtifact.binary.path).toBe(
      "projects/project_image_flow/slides/images/slide_003.v2.png",
    );
    expect(regenerated.candidate.originalBackgroundArtifactId).toBe(
      "project_image_flow_image_slide_003_v1",
    );
    expect(regenerated.candidate.backgroundArtifactId).toBe("project_image_flow_image_slide_003_v2");
    expect(
      regenerated.candidate.beforeImageDescriptor === regenerated.candidate.afterImageDescriptor,
    ).toBe(false);
    expect(regenerated.projectPatch.slides.find((slide) => slide.number === 3)?.version).toBe(2);
    expect(regenerated.projectPatch.slides.find((slide) => slide.number === 3)?.status).toBe(
      "approved",
    );
    expect(writes.map((write) => write.path).filter((path) => path.includes("slide_003"))).toEqual([
      "projects/project_image_flow/slides/images/slide_003.v1.png",
      "projects/project_image_flow/slides/images/slide_003.v1.metadata.json",
      "projects/project_image_flow/slides/images/slide_003.v2.png",
      "projects/project_image_flow/slides/images/slide_003.v2.metadata.json",
    ]);
  });
});

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("서울시 마라톤 시민 건강 캠페인", 5, "16:9"),
    id: "brief_image_flow",
    approvedHash: "sha256:brief",
  };
  const research = {
    ...mockResearch(brief),
    id: "research_image_flow",
    approvedHash: "sha256:research",
  };
  const plan = {
    ...mockPlan(brief, research),
    id: "plan_image_flow",
    approvedHash: "sha256:plan",
    slides: mockPlan(brief, research).slides.slice(0, 5),
  };
  const design = { ...mockDesign(brief, plan), id: "design_image_flow", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), id: "layout_image_flow", approvedHash: "sha256:layout" };
  return {
    id: "project_image_flow",
    name: "Image Flow",
    initialPrompt: "서울시 마라톤 PPT",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "GENERATING_SLIDES",
    createdAt: NOW,
    updatedAt: NOW,
    brief,
    research,
    plan,
    design,
    layout,
    invalidated: {},
    approvalLog: [],
  };
}
