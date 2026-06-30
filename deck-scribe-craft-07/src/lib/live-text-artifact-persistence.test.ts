import { describe, expect, test } from "bun:test";
import { planInterviewQuestions } from "./interview-questions";
import {
  accepted,
  completeBrief,
  liveCodexProvenance,
  pipelineFixtures,
} from "./live-text-artifact-persistence.fixtures";
import {
  createLiveInterviewPersistence,
  createLiveTextPipelinePersistence,
} from "./live-text-artifact-persistence";

describe("live text artifact persistence", () => {
  test("persists accepted live interview question and brief artifacts without fixture fallback", () => {
    const questionPlan = planInterviewQuestions({
      initialPrompt: "임원 보고용 5장 성과 리뷰 덱을 만들어줘.",
      slideCount: 5,
      aspectRatio: "16:9",
      language: "ko",
    });

    const result = createLiveInterviewPersistence({
      projectId: "p_live_text",
      createdAt: 1_710_000_000_000,
      questionPlan: accepted(
        questionPlan,
        liveCodexProvenance(
          "interview_questions_live_1",
          "turn_questions",
          "interview_questions@v1",
          [],
        ),
      ),
      answers: {
        goal: "성과 리뷰",
        audience: "임원",
        coreMessage: "채널별 성과와 다음 분기 실행 계획을 연결한다.",
        desiredOutcome: "예산 승인",
        mustInclude: "채널별 성과와 다음 분기 실행 계획",
        mustAvoid: "출처 없는 성과 과장",
        successCriteria: "임원 승인",
        tone: "절제된 보고 톤",
      },
      brief: accepted(
        completeBrief(),
        liveCodexProvenance("interview_brief_live_1", "turn_brief", "interview_brief@v1", [
          "interview_questions_live_1",
        ]),
      ),
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.patch.stage).toBe("INTERVIEW_APPROVAL_PENDING");
    expect(result.patch.brief.id).toBe("brief_live_1");
    expect(result.artifacts.map((artifact) => artifact.record.artifactId)).toEqual([
      "interview_questions_live_1",
      "interview_brief_live_1",
    ]);
    expect(result.artifacts.map((artifact) => artifact.record.artifactType)).toEqual([
      "interview_questions",
      "interview_brief",
    ]);
    expect(result.provenanceLineage.map((item) => item.turnId)).toEqual([
      "turn_questions",
      "turn_brief",
    ]);
    expect(result.artifacts.every((artifact) => artifact.provenance.fixture === false)).toBe(true);
  });

  test("persists accepted live plan design and Layout IR as a project patch", () => {
    const fixtures = pipelineFixtures();

    const result = createLiveTextPipelinePersistence({
      projectId: "p_live_text",
      createdAt: 1_710_000_000_000,
      deckContextId: "deckctx_live_text",
      expectedSlideCount: 5,
      deckPlan: accepted(
        fixtures.plan,
        liveCodexProvenance("deck_plan_live_1", "turn_plan", "deck_plan@v1", [
          "brief_live_1",
          "research_live_1",
        ]),
      ),
      designSystem: accepted(
        fixtures.design,
        liveCodexProvenance("design_system_live_1", "turn_design", "design_system@v1", [
          "deck_plan_live_1",
        ]),
      ),
      layoutIr: accepted(
        fixtures.layoutIr,
        liveCodexProvenance("layout_ir_live_1", "turn_layout", "layout_ir@v1", [
          "deck_plan_live_1",
          "design_system_live_1",
        ]),
      ),
      slideContextRefs: fixtures.plan.slides.map((slide) => ({
        slideNumber: slide.number,
        deckContextId: "deckctx_live_text",
        designSystemId: fixtures.design.id,
      })),
      repairAttempts: [],
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.patch.stage).toBe("LAYOUT_APPROVAL_PENDING");
    expect(result.patch.plan.id).toBe("plan_live_1");
    expect(result.patch.design.id).toBe(fixtures.design.id);
    expect(result.patch.layout.slides.length).toBe(5);
    expect(result.patch.layout.slides.every((slide) => slide.domLayers.length > 0)).toBe(true);
    expect(result.patch.layout.validationReport?.status).toBe("passed");
    expect(
      result.patch.layout.slides.every((slide) =>
        slide.layoutPngDataUrl?.startsWith("data:image/png;base64,"),
      ),
    ).toBe(true);
    expect(result.artifacts.map((artifact) => artifact.record.artifactType)).toEqual([
      "deck_plan",
      "design_system",
      "layout_ir",
    ]);
    expect(result.provenanceLineage.map((item) => item.turnId)).toEqual([
      "turn_plan",
      "turn_design",
      "turn_layout",
    ]);
  });

  test("returns a live repair request instead of persisting invalid plan output", () => {
    const fixtures = pipelineFixtures();

    const result = createLiveTextPipelinePersistence({
      projectId: "p_live_text",
      createdAt: 1_710_000_000_000,
      deckContextId: "deckctx_live_text",
      expectedSlideCount: 5,
      deckPlan: accepted(
        { ...fixtures.plan, markdown: "# Invalid live plan" },
        liveCodexProvenance("deck_plan_live_bad", "turn_plan_bad", "deck_plan@v1", [
          "brief_live_1",
          "research_live_1",
        ]),
      ),
      designSystem: accepted(
        fixtures.design,
        liveCodexProvenance("design_system_live_1", "turn_design", "design_system@v1", [
          "deck_plan_live_bad",
        ]),
      ),
      layoutIr: accepted(
        fixtures.layoutIr,
        liveCodexProvenance("layout_ir_live_1", "turn_layout", "layout_ir@v1", [
          "deck_plan_live_bad",
          "design_system_live_1",
        ]),
      ),
      slideContextRefs: fixtures.plan.slides.map((slide) => ({
        slideNumber: slide.number,
        deckContextId: "deckctx_live_text",
        designSystemId: fixtures.design.id,
      })),
      repairAttempts: [],
    });

    expect(result.kind).toBe("repair_required");
    if (result.kind !== "repair_required") return;
    expect(result.stage).toBe("deck_plan");
    expect(result.nextTurn.requiresLiveCodex).toBe(true);
    expect(result.nextTurn.inputArtifactIds).toEqual(["deck_plan_live_bad"]);
  });
});
