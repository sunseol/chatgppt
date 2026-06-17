import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { createFrozenDeckContext } from "./deck-context";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { buildSlideContextBundles, type SlideContextBundle } from "./slide-context-bundle";
import { buildSlidePromptPackage } from "./slide-prompt-package";
import {
  createMockSlideImageProvider,
  createOpenAIImageProvider,
  generateSlideImage,
  type OpenAIImageClientRequest,
} from "./slide-image-provider";

describe("slide image provider call", () => {
  test("mock provider generates a 16:9 slide artifact from prompt package", async () => {
    const pkg = buildSlidePromptPackage(chartSlideBundle());
    const result = await generateSlideImage({
      provider: createMockSlideImageProvider({ now: () => 123 }),
      package: pkg,
      aspectRatio: "16:9",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.artifact.imageDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(result.artifact.canvas).toEqual({ width: 1600, height: 900 });
    expect(result.artifact.aspectRatio).toBe("16:9");
    expect(result.artifact.layoutReference).toEqual({
      screenshot: "slide_03_layout.png",
      mode: "composition-reference",
    });
    expect(result.slide).toEqual({
      number: 3,
      version: 1,
      status: "ready",
      imageDescriptor: "mock|16:9|slide_03_layout.png|slide_generation@v1",
      notes: "Generated visual background; editable text/chart overlays are applied later.",
    });
  });

  test("OpenAI-style provider sends prompt, aspect ratio, model, and layout reference", async () => {
    const requests: OpenAIImageClientRequest[] = [];
    const provider = createOpenAIImageProvider({
      async generate(request) {
        requests.push(request);
        return { imageDataUrl: "data:image/png;base64,ZmFrZQ==" };
      },
    });
    const pkg = buildSlidePromptPackage(chartSlideBundle());
    const result = await generateSlideImage({ provider, package: pkg, aspectRatio: "4:3" });

    expect(result.kind).toBe("ready");
    expect(requests).toEqual([
      {
        model: "gpt-image-2",
        prompt: pkg.prompt,
        aspectRatio: "4:3",
        layoutReference: {
          screenshot: "slide_03_layout.png",
          mode: "composition-reference",
        },
      },
    ]);
  });

  test("provider failures return retryable user-facing metadata", async () => {
    const provider = createOpenAIImageProvider({
      async generate() {
        throw new TypeError("image quota exceeded");
      },
    });
    const result = await generateSlideImage({
      provider,
      package: buildSlidePromptPackage(chartSlideBundle()),
      aspectRatio: "16:9",
    });

    expect(result).toEqual({
      kind: "failed",
      failure: {
        providerId: "openaiImage",
        slideNumber: 3,
        retryable: true,
        errorMessage: "image quota exceeded",
        userMessage: "Slide 3 image generation failed: image quota exceeded. Retry is available.",
      },
    });
  });
});

function chartSlideBundle(): SlideContextBundle {
  const project = approvedProject();
  const contextResult = createFrozenDeckContext(project, { now: () => 1_789_500_000 });
  if (contextResult.kind !== "ready") throw new Error("Expected approved fixture context.");
  const bundleResult = buildSlideContextBundles({
    project,
    context: contextResult.context,
  });
  if (bundleResult.kind !== "ready") throw new Error("Expected slide bundles.");
  const bundle = bundleResult.bundles.find((item) => item.slideSpec.slideNumber === 3);
  if (!bundle) throw new Error("Expected chart slide bundle.");
  return bundle;
}

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Image provider deck", 8, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Image Provider",
    initialPrompt: "Create a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
    stage: "GENERATING_SLIDES",
    createdAt: 1_789_500_000,
    updatedAt: 1_789_500_000,
    brief,
    research,
    plan,
    design,
    layout,
    invalidated: {},
    approvalLog: [],
  };
}
