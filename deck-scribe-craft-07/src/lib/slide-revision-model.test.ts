import { describe, expect, test } from "bun:test";
import { mockBrief, mockDesign, mockPlan, mockResearch, mockSlides } from "./mock-ai";
import { SlideRevisionContextError, createSlideRevisionRequest } from "./slide-revision-model";

describe("slide revision request model", () => {
  test("structures a chart resize request while preserving major non-target elements", () => {
    const fixture = approvedFixture();
    const request = createSlideRevisionRequest({
      projectId: "project_001",
      instruction: "오른쪽 그래프 영역을 더 크게 하고, 하단 출처는 유지해줘.",
      slide: fixture.slide,
      slideSpec: fixture.slideSpec,
      design: fixture.design,
      plan: fixture.plan,
      now: () => 123,
      createId: () => "rev_001",
    });

    expect(request.editInstruction).toBe(
      "오른쪽 그래프 영역을 더 크게 하고, 하단 출처는 유지해줘.",
    );
    expect(request.mustChange).toEqual(["chart area size"]);
    expect(request.mustKeep).toEqual([
      "title text",
      "main statistics",
      "source caption",
      "background style",
      "approved color palette",
      "global design style",
      "layout hierarchy",
    ]);
    expect(request.designSystemId).toBe(fixture.design.id);
    expect(request.slidePlanId).toBe(fixture.plan.id);
  });

  test("targets title text without dropping other preservation rules", () => {
    const fixture = approvedFixture();
    const request = createSlideRevisionRequest({
      projectId: "project_001",
      instruction: "제목을 더 짧고 강하게 바꿔줘.",
      slide: fixture.slide,
      slideSpec: fixture.slideSpec,
      design: fixture.design,
      plan: fixture.plan,
      now: () => 123,
      createId: () => "rev_002",
    });

    expect(request.mustChange).toEqual(["title text"]);
    expect(request.mustKeep.includes("title text")).toBe(false);
    expect(request.mustKeep.includes("main statistics")).toBe(true);
    expect(request.mustKeep.includes("source caption")).toBe(true);
  });

  test("creates deterministic revision artifact metadata", () => {
    const fixture = approvedFixture();
    const request = createSlideRevisionRequest({
      projectId: "project_001",
      instruction: "차트와 출처는 유지하고 배경만 더 차분하게.",
      slide: fixture.slide,
      slideSpec: fixture.slideSpec,
      design: fixture.design,
      plan: fixture.plan,
      now: () => 123,
      createId: () => "rev_003",
    });

    expect(request.artifact).toEqual({
      id: "rev_003",
      projectId: "project_001",
      type: "slide_revision",
      path: "projects/project_001/slides/slide_03/revisions/rev_003.json",
      hash: request.artifact.hash,
      createdAt: 123,
    });
    expect(request.artifact.hash.startsWith("sha256:")).toBe(true);
  });

  test("rejects a revision request when the generated slide and plan spec differ", () => {
    const fixture = approvedFixture();

    expect(() =>
      createSlideRevisionRequest({
        projectId: "project_001",
        instruction: "배경만 더 차분하게 바꿔줘.",
        slide: fixture.slide,
        slideSpec: { ...fixture.slideSpec, number: fixture.slideSpec.number + 1 },
        design: fixture.design,
        plan: fixture.plan,
        now: () => 123,
        createId: () => "rev_004",
      }),
    ).toThrow(SlideRevisionContextError);
  });
});

function approvedFixture() {
  const brief = mockBrief("Revision request model", 8, "16:9");
  const research = mockResearch(brief);
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const slideSpec = plan.slides[2];
  const slide = mockSlides(plan)[2];
  if (!slideSpec || !slide) throw new Error("Expected slide 3 fixture.");
  return { plan, design, slideSpec, slide };
}
