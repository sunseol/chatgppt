import { describe, expect, test } from "bun:test";
import type { CodexAppServerJsonRpcNotification } from "./codex-app-server-event-mapper";
import type { StructuredCodexParser } from "./codex-structured-task-runner";
import { planInterviewQuestions } from "./interview-questions";
import { createProviderJobManager } from "./provider-job-manager";
import { completeBrief, pipelineFixtures } from "./live-text-artifact-persistence.fixtures";
import {
  runLiveInterviewProductionWorkflow,
  runLiveTextPipelineProductionWorkflow,
} from "./live-text-production-workflow";

describe("live text production workflow", () => {
  test("runs production App Server interview jobs and persists a live brief patch", async () => {
    const questionPlan = planInterviewQuestions({
      initialPrompt:
        "임원 대상 내부 보고용. 채널별 성과, 다음 분기 계획, 절제된 데이터 기반 톤으로 승인받고 싶어. 출처 없는 그래프는 피한다.",
      slideCount: 5,
      aspectRatio: "16:9",
      language: "ko",
    });
    const manager = createProviderJobManager({ createId: sequentialIds("job_live_interview") });

    const result = await runLiveInterviewProductionWorkflow({
      projectId: "p_live_interview_workflow",
      createdAt: 1_710_000_000_000,
      jobManager: manager,
      questionPlanJob: productionJob(
        "interview_questions_live_1",
        "interview_questions@v1",
        [],
        questionPlan,
      ),
      answers: {
        coreMessage: "성과 학습을 다음 분기 예산 승인으로 연결한다.",
      },
      briefJob: productionJob(
        "interview_brief_live_1",
        "interview_brief@v1",
        ["interview_questions_live_1"],
        completeBrief(),
      ),
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.patch.stage).toBe("INTERVIEW_APPROVAL_PENDING");
    expect(result.artifacts.map((artifact) => artifact.record.artifactType)).toEqual([
      "interview_questions",
      "interview_brief",
    ]);
    expect(result.provenanceLineage.map((item) => item.turnId)).toEqual([
      "turn_interview_questions_live_1",
      "turn_interview_brief_live_1",
    ]);
  });

  test("runs production App Server jobs and persists a ready text pipeline bundle", async () => {
    const fixtures = pipelineFixtures();
    const manager = createProviderJobManager({ createId: sequentialIds("job_live_text") });

    const result = await runLiveTextPipelineProductionWorkflow({
      projectId: "p_live_text_workflow",
      createdAt: 1_710_000_000_000,
      jobManager: manager,
      deckContextId: "deckctx_live_text",
      expectedSlideCount: 5,
      deckPlanJob: productionJob("deck_plan_live_1", "deck_plan@v1", [], fixtures.plan),
      designSystemJob: productionJob(
        "design_system_live_1",
        "design_system@v1",
        ["deck_plan_live_1"],
        fixtures.design,
      ),
      layoutIrJob: productionJob(
        "layout_ir_live_1",
        "layout_ir@v1",
        ["deck_plan_live_1", "design_system_live_1"],
        fixtures.layoutIr,
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
    expect(result.patch.layout.slides.length).toBe(5);
    expect(result.artifacts.map((artifact) => artifact.record.artifactId)).toEqual([
      "deck_plan_live_1",
      "design_system_live_1",
      "layout_ir_live_1",
    ]);
    expect(result.provenanceLineage.map((item) => item.turnId)).toEqual([
      "turn_deck_plan_live_1",
      "turn_design_system_live_1",
      "turn_layout_ir_live_1",
    ]);
    expect(manager.snapshot().map((job) => job.status)).toEqual([
      "succeeded",
      "succeeded",
      "succeeded",
    ]);
  });

  test("stops before persistence when an App Server job fails schema validation", async () => {
    const fixtures = pipelineFixtures();
    const manager = createProviderJobManager({ createId: sequentialIds("job_live_text_fail") });

    const result = await runLiveTextPipelineProductionWorkflow({
      projectId: "p_live_text_workflow",
      createdAt: 1_710_000_000_000,
      jobManager: manager,
      deckContextId: "deckctx_live_text",
      expectedSlideCount: 5,
      deckPlanJob: productionJob("deck_plan_live_1", "deck_plan@v1", [], fixtures.plan),
      designSystemJob: productionJob(
        "design_system_live_bad",
        "design_system@v1",
        ["deck_plan_live_1"],
        fixtures.design,
        { invalid: true },
      ),
      layoutIrJob: productionJob(
        "layout_ir_live_1",
        "layout_ir@v1",
        ["deck_plan_live_1", "design_system_live_bad"],
        fixtures.layoutIr,
      ),
      slideContextRefs: [],
      repairAttempts: [],
    });

    expect(result.kind).toBe("job_failed");
    if (result.kind !== "job_failed") return;
    expect(result.stage).toBe("design_system");
    expect(result.job.status).toBe("failed");
    expect(manager.snapshot().length).toBe(2);
  });
});

function productionJob<TValue>(
  artifactId: string,
  promptVersion: string,
  inputArtifactIds: readonly string[],
  expected: TValue,
  payload: unknown = expected,
) {
  return {
    capability: "layoutPrototype" as const,
    description: `Run ${artifactId}`,
    artifactId,
    parse: exactJsonParser(expected),
    runtime: "codex-app-server 0.141.0",
    promptVersion,
    durationMs: 2_400,
    inputArtifactIds,
    notifications: notificationStream(artifactId, payload),
  };
}

function exactJsonParser<TValue>(expected: TValue): StructuredCodexParser<TValue> {
  const expectedJson = JSON.stringify(expected);
  return (value) =>
    JSON.stringify(value) === expectedJson
      ? { kind: "valid", value: expected }
      : { kind: "invalid", issues: ["payload did not match expected structured output"] };
}

async function* notificationStream<TValue>(
  artifactId: string,
  payload: TValue,
): AsyncIterable<CodexAppServerJsonRpcNotification> {
  const threadId = "thread_live_text_workflow";
  const turnId = `turn_${artifactId}`;
  yield { method: "turn/started", params: { threadId, turn: { id: turnId } } };
  yield {
    method: "item/completed",
    params: { threadId, turnId, item: { type: "agentMessage", text: JSON.stringify(payload) } },
  };
  yield { method: "turn/completed", params: { threadId, turn: { id: turnId } } };
}

function sequentialIds(prefix: string): () => string {
  let value = 0;
  return () => {
    value += 1;
    return `${prefix}_${value}`;
  };
}
