import { describe, expect, test } from "bun:test";
import { mockBrief, mockDesign, mockPlan, mockResearch, mockSlides } from "./mock-ai";
import { createSlideRevisionRequest } from "./slide-revision-model";
import {
  createMockSlideRevisionGenerationProvider,
  generatePreservedSlideRevision,
} from "./slide-revision-generation";

describe("preserve-original slide revision generation", () => {
  test("passes original image and edit instruction to the revision provider", async () => {
    const fixture = revisionFixture("오른쪽 차트를 더 크게 만들어줘.");
    const result = await generatePreservedSlideRevision({
      projectId: "project_001",
      request: fixture.request,
      originalSlide: fixture.slide,
      originalImage: originalImage(),
      provider: createMockSlideRevisionGenerationProvider(),
      now: () => 456,
    });

    if (result.kind !== "ready") throw new Error("Expected ready revision result.");
    expect(result.slide.version).toBe(fixture.slide.version + 1);
    expect(result.slide.status).toBe("ready");
    expect(result.slide.imageDescriptor.includes("source=sha256:original-image")).toBe(true);
    expect(
      result.slide.imageDescriptor.includes("instruction=오른쪽 차트를 더 크게 만들어줘."),
    ).toBe(true);
    expect(result.artifact.path).toBe(
      "projects/project_001/slides/slide_03/revisions/rev_101/generation_v2.json",
    );
    expect(result.artifact.hash.startsWith("sha256:")).toBe(true);
  });

  test("fails when a must-keep target changes", async () => {
    const fixture = revisionFixture("오른쪽 차트를 더 크게 만들어줘.");
    const result = await generatePreservedSlideRevision({
      projectId: "project_001",
      request: fixture.request,
      originalSlide: fixture.slide,
      originalImage: originalImage(),
      provider: createMockSlideRevisionGenerationProvider({
        changedKeepItems: ["source caption"],
      }),
      now: () => 456,
    });

    expect(result.kind).toBe("failed");
    if (result.kind !== "failed") throw new Error("Expected failed revision result.");
    expect(result.failure.code).toBe("must-keep-changed");
    expect(result.failure.changedKeepItems).toEqual(["source caption"]);
    expect(
      result.comparison.preservationChecks.find((check) => check.target === "source caption"),
    ).toEqual({
      target: "source caption",
      status: "changed",
      message: "source caption changed during revision.",
    });
  });

  test("creates stable before and after comparison for successful revision", async () => {
    const fixture = revisionFixture("오른쪽 차트를 더 크게 만들어줘.");
    const result = await generatePreservedSlideRevision({
      projectId: "project_001",
      request: fixture.request,
      originalSlide: fixture.slide,
      originalImage: originalImage(),
      provider: createMockSlideRevisionGenerationProvider(),
      now: () => 456,
    });

    if (result.kind !== "ready") throw new Error("Expected ready revision result.");
    expect(result.comparison).toEqual({
      slideNumber: 3,
      originalSlideVersion: 1,
      revisedSlideVersion: 2,
      beforeImageDescriptor: fixture.slide.imageDescriptor,
      afterImageDescriptor: result.slide.imageDescriptor,
      requestedChanges: ["chart area size"],
      preservedTargets: fixture.request.mustKeep,
      preservationChecks: fixture.request.mustKeep.map((target) => ({
        target,
        status: "kept",
        message: `${target} preserved.`,
      })),
      summary: "Slide 3 revision v2 keeps 7 targets and changes chart area size.",
    });
  });
});

function revisionFixture(instruction: string) {
  const brief = mockBrief("Revision generation", 8, "16:9");
  const research = mockResearch(brief);
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const slideSpec = plan.slides[2];
  const slide = mockSlides(plan)[2];
  if (!slideSpec || !slide) throw new Error("Expected slide 3 fixture.");
  const request = createSlideRevisionRequest({
    projectId: "project_001",
    instruction,
    slide,
    slideSpec,
    design,
    plan,
    now: () => 123,
    createId: () => "rev_101",
  });
  return { request, slide };
}

function originalImage() {
  return {
    artifactId: "project_001_slide_03_v1",
    imageDataUrl: "data:image/png;base64,original",
    hash: "sha256:original-image",
  };
}
