import { describe, expect, test } from "bun:test";
import type { DeckProject, SlideSpec } from "./deck-types";
import { buildLiveGenerationReportLineage } from "./live-generation-report-lineage-builder";
import { mockBrief, mockResearch } from "./mock-ai";
import { encodeSolidPngDataUrl } from "./png-encoder";

describe("live generation report lineage builder", () => {
  test("does not require source trace for structural slide constraints", () => {
    const project = projectFixture({
      evidence: [],
      dataSourceConstraints: ["structural slide"],
    });

    const lineage = buildLiveGenerationReportLineage({
      project,
      exportPackage: {
        pngFiles: [{ slideNumber: 1, hash: fullHash("a") }],
        projectFile: { content: '{"project":"project_001"}' },
      },
    });

    expect(lineage[0]?.sourceIds).toEqual([]);
    expect(lineage[0]?.requiresSourceTrace).toBe(false);
  });
});

function projectFixture(slide: Pick<SlideSpec, "evidence" | "dataSourceConstraints">): DeckProject {
  const brief = mockBrief("Lineage Builder", 1, "16:9");
  const research = mockResearch(brief);
  const imageDataUrl = encodeSolidPngDataUrl({
    width: 160,
    height: 90,
    color: { r: 12, g: 120, b: 180, a: 255 },
  });
  return {
    id: "project_001",
    name: "Lineage Builder",
    initialPrompt: "Build a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "FINAL_REPORTING",
    createdAt: 100,
    updatedAt: 200,
    research,
    plan: {
      id: "plan_001",
      markdown: "# Plan",
      approvedHash: "sha256:plan",
      slides: [
        {
          number: 1,
          title: "Cover",
          role: "Cover",
          coreMessage: "A structural cover slide.",
          visualType: "key message",
          editableElements: [],
          ...slide,
        },
      ],
    },
    liveTextArtifacts: [
      {
        artifactId: "plan_live_001",
        projectId: "project_001",
        artifactType: "deck_plan",
        version: 1,
        hash: "sha256:plan",
        path: "projects/project_001/plans/plan.json",
        createdAt: 200,
        turnId: "turn_plan_001",
        threadId: "thread_project_001",
      },
    ],
    liveSlideGeneration: {
      version: 1,
      generatedAt: 200,
      artifacts: [
        {
          providerId: "openaiImage",
          slideNumber: 1,
          aspectRatio: "16:9",
          canvas: { width: 1600, height: 900 },
          layoutReference: { screenshot: "slide_01_layout.png", mode: "composition-reference" },
          imageDataUrl,
          prompt: { id: "slide_generation", version: "v1", hash: "sha256:prompt" },
          request: { model: "gpt-image-2", requestId: "img_req_001" },
          generatedAt: 200,
        },
      ],
      storedArtifacts: [
        {
          binary: {
            artifactId: "project_001_image_slide_001_v1",
            path: "projects/project_001/slides/images/slide_001.v1.png",
            hash: fullHash("a"),
            bytes: 72,
            createdAt: 200,
          },
          metadata: {
            path: "projects/project_001/slides/images/slide_001.v1.metadata.json",
            providerId: "openaiImage",
            slideNumber: 1,
            aspectRatio: "16:9",
            canvas: { width: 1600, height: 900 },
            layoutReference: { screenshot: "slide_01_layout.png", mode: "composition-reference" },
            prompt: { id: "slide_generation", version: "v1", hash: "sha256:prompt" },
            request: { model: "gpt-image-2", requestId: "img_req_001" },
            generatedAt: 200,
          },
          provenance: {
            artifactId: "project_001_image_slide_001_v1",
            executionMode: "production",
            providerKind: "openaiImage",
            authMode: "api_key",
            modelOrRuntime: "gpt-image-2",
            promptVersion: "slide_generation@v1",
            durationMs: 1_000,
            inputArtifactIds: ["sha256:prompt"],
            fixture: false,
            requestId: "img_req_001",
          },
        },
      ],
      compositions: [
        {
          slideNumber: 1,
          exportBasis: "compositor",
          canvas: { width: 1600, height: 900 },
          backgroundProviderId: "openaiImage",
          backgroundArtifact: {
            artifactId: "project_001_image_slide_001_v1",
            path: "projects/project_001/slides/images/slide_001.v1.png",
            hash: fullHash("a"),
          },
          overlayRoles: ["title"],
          overlayBounds: [],
          svg: "<svg />",
          previewPngDataUrl: imageDataUrl,
        },
      ],
      providerLineage: [],
    },
    invalidated: {},
    approvalLog: [],
  };
}

function fullHash(seed: string): string {
  return `sha256:${seed.repeat(64)}`;
}
