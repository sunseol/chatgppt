import { describe, expect, test } from "bun:test";
import {
  createLiveInterviewQuestionArtifactPatch,
  runDesktopLiveInterviewProductionWorkflow,
} from "./desktop-live-interview-workflow";
import { planInterviewQuestions } from "./interview-questions";
import { createProviderJobManager } from "./provider-job-manager";
import type { DeckProject, InterviewBrief } from "./deck-types";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";

describe("desktop live interview workflow", () => {
  test("runs a desktop structured questions turn and returns a persisted question artifact", async () => {
    // Given
    const calls: string[] = [];
    const questionPlan = planInterviewQuestions({
      initialPrompt: "임원 보고 덱. 채널별 성과를 다루고 싶다.",
      slideCount: 5,
      aspectRatio: "16:9",
      language: "ko",
    });
    const runtime = structuredTurnRuntime("interview_questions_live_desktop", questionPlan, calls);

    // When
    const result = await runDesktopLiveInterviewProductionWorkflow({
      project: projectFixture(),
      jobManager: createProviderJobManager({ createId: () => "job_desktop_interview" }),
      tauriRuntime: runtime,
      answers: {},
      createdAt: 1_789_350_000_000,
    });

    // Then
    expect(result.kind).toBe("follow_up_required");
    if (result.kind !== "follow_up_required") return;
    expect(calls).toEqual(["deckforge_codex_app_server_structured_turn"]);
    expect(result.questionArtifact.record.artifactType).toBe("interview_questions");
    expect(result.questionArtifact.record.turnId).toBe("turn_interview_questions_live_desktop");
    expect(result.nextTurn.inputArtifactIds).toEqual(["p_desktop_interview_questions_live"]);
  });

  test("sends a strict live question schema accepted by the app-server", async () => {
    // Given
    const calls: string[] = [];
    const requests: unknown[] = [];
    const questionPlan = planInterviewQuestions({
      initialPrompt: "초기 VC용 제품 피치덱",
      slideCount: 8,
      aspectRatio: "16:9",
      language: "ko",
    });
    const runtime = structuredTurnSequenceRuntime(
      [{ artifactId: "strict_interview_questions", payload: questionPlan }],
      calls,
      requests,
    );

    // When
    await runDesktopLiveInterviewProductionWorkflow({
      project: projectFixture(),
      jobManager: createProviderJobManager({ createId: () => "job_strict_schema" }),
      tauriRuntime: runtime,
      answers: {},
      createdAt: 1_789_350_000_000,
    });

    // Then
    const schema = structuredTurnRequestSchema(requests[0]);
    expect(collectNonStrictObjectSchemaPaths(schema)).toEqual([]);
    expect(readRecord(readRecord(schema.properties).draft).required).toEqual([
      "goal",
      "audience",
      "desiredOutcome",
      "coreMessage",
      "slideCount",
      "aspectRatio",
      "language",
      "tone",
      "mustInclude",
      "mustAvoid",
      "successCriteria",
    ]);
    expect(readRecord(readRecord(readRecord(schema.properties).questions).items).required).toEqual([
      "field",
      "question",
    ]);
  });

  test("runs a second desktop brief turn after required answers are supplied", async () => {
    // Given
    const calls: string[] = [];
    const questionPlan = planInterviewQuestions({
      initialPrompt: "새로운 B2B SaaS 제품 피치덱",
      slideCount: 5,
      aspectRatio: "16:9",
      language: "ko",
    });
    const runtime = structuredTurnSequenceRuntime(
      [
        { artifactId: "interview_questions_live_desktop", payload: questionPlan },
        { artifactId: "interview_brief_live_desktop", payload: briefFixture() },
      ],
      calls,
    );

    // When
    const result = await runDesktopLiveInterviewProductionWorkflow({
      project: projectFixture(),
      jobManager: createProviderJobManager({ createId: sequentialIds("job_desktop_interview") }),
      tauriRuntime: runtime,
      answers: {
        goal: "투자 유치용 제품 피치덱",
        audience: "초기 VC",
        desiredOutcome: "후속 미팅 요청",
        coreMessage: "검증 자동화가 AI 슬라이드 제작의 신뢰 문제를 해결한다.",
        tone: "절제된, 신뢰감 있는",
        mustInclude: "문제, 솔루션, 시장, 비즈니스 모델",
        mustAvoid: "출처 없는 수치",
        successCriteria: "투자자가 후속 미팅을 요청한다.",
      },
      createdAt: 1_789_350_010_000,
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(calls).toEqual([
      "deckforge_codex_app_server_structured_turn",
      "deckforge_codex_app_server_structured_turn",
    ]);
    expect(result.patch.stage).toBe("INTERVIEW_APPROVAL_PENDING");
    expect(result.patch.brief.id).toBe("brief_live_desktop");
    expect(result.artifacts.map((artifact) => artifact.record.artifactType)).toEqual([
      "interview_questions",
      "interview_brief",
    ]);
    expect(result.provenanceLineage.map((item) => item.turnId)).toEqual([
      "turn_interview_questions_live_desktop",
      "turn_interview_brief_live_desktop",
    ]);
  });

  test("creates a project patch that preserves live interview question artifacts", () => {
    // Given
    const project = projectFixture({
      liveTextArtifacts: [
        {
          artifactId: "old_questions",
          projectId: "p_desktop_interview",
          artifactType: "interview_questions",
          version: 1,
          hash: "sha256:old",
          path: "projects/p_desktop_interview/briefs/old_questions.json",
          createdAt: 1,
        },
      ],
    });
    const result = createLiveInterviewQuestionArtifactPatch(project, {
      artifactId: "new_questions",
      projectId: "p_desktop_interview",
      artifactType: "interview_questions",
      version: 1,
      hash: "sha256:new",
      path: "projects/p_desktop_interview/briefs/new_questions.json",
      createdAt: 2,
      turnId: "turn_new_questions",
      threadId: "thread_new_questions",
    });

    // Then
    expect(result.liveTextArtifacts.map((artifact) => artifact.artifactId)).toEqual([
      "old_questions",
      "new_questions",
    ]);
    expect(result.stage).toBe("INTERVIEWING");
  });
});

function structuredTurnRuntime(
  artifactId: string,
  payload: unknown,
  calls: string[],
): DeckforgeTauriRuntime {
  return structuredTurnSequenceRuntime([{ artifactId, payload }], calls);
}

function structuredTurnSequenceRuntime(
  turns: readonly { readonly artifactId: string; readonly payload: unknown }[],
  calls: string[],
  requests: unknown[] = [],
): DeckforgeTauriRuntime {
  let index = 0;
  return {
    core: {
      invoke: async (command, args) => {
        calls.push(command);
        requests.push(args?.request);
        const turn = turns[index];
        index += 1;
        if (turn === undefined) {
          throw { code: "unexpected_turn", message: "No structured turn fixture is available." };
        }
        const threadId = "thread_desktop_interview";
        const turnId = `turn_${turn.artifactId}`;
        return {
          runtime: "codex app-server",
          threadId,
          turnId,
          turnCompleted: true,
          durationMs: 1_900,
          eventMethods: ["turn/started", "item/completed", "turn/completed"],
          notifications: [
            { method: "turn/started", params: { threadId, turn: { id: turnId } } },
            {
              method: "item/completed",
              params: {
                threadId,
                turnId,
                item: { type: "agentMessage", text: JSON.stringify(turn.payload) },
              },
            },
            { method: "turn/completed", params: { threadId, turn: { id: turnId } } },
          ],
        };
      },
    },
  };
}

function structuredTurnRequestSchema(request: unknown): Record<string, unknown> {
  const value = readRecord(request).outputSchema;
  return readRecord(value);
}

function collectNonStrictObjectSchemaPaths(schema: Record<string, unknown>, path = "$"): string[] {
  const issues: string[] = [];
  if (schema.type === "object") {
    if (schema.additionalProperties !== false) issues.push(path);
    const properties = schema.properties;
    if (isRecord(properties)) {
      for (const [key, value] of Object.entries(properties)) {
        if (isRecord(value)) {
          issues.push(...collectNonStrictObjectSchemaPaths(value, `${path}.properties.${key}`));
        }
      }
    }
  }
  if (schema.type === "array" && isRecord(schema.items)) {
    issues.push(...collectNonStrictObjectSchemaPaths(schema.items, `${path}.items`));
  }
  return issues;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`Expected record, received ${JSON.stringify(value)}`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function briefFixture(): InterviewBrief {
  return {
    id: "brief_live_desktop",
    goal: "투자 유치용 제품 피치덱",
    audience: "초기 VC",
    desiredOutcome: "후속 미팅 요청",
    slideCount: 5,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["절제된", "신뢰감 있는"],
    mustInclude: ["문제", "솔루션", "시장", "비즈니스 모델"],
    mustAvoid: ["출처 없는 수치"],
    successCriteria: ["투자자가 후속 미팅을 요청한다."],
    openQuestions: [],
  };
}

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_desktop_interview",
    name: "Desktop Interview",
    initialPrompt: "임원 보고 덱. 채널별 성과를 다루고 싶다.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "INTERVIEWING",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    invalidated: {},
    approvalLog: [],
    ...patch,
  };
}

function sequentialIds(prefix: string): () => string {
  let value = 0;
  return () => {
    value += 1;
    return `${prefix}_${value}`;
  };
}
