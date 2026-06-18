import { describe, expect, test } from "bun:test";
import {
  createLiveInterviewQuestionArtifactPatch,
  runDesktopLiveInterviewProductionWorkflow,
} from "./desktop-live-interview-workflow";
import { interviewQuestionPlanJob } from "./desktop-live-interview-jobs";
import { planInterviewQuestions } from "./interview-questions";
import { createProviderJobManager } from "./provider-job-manager";
import type { DeckProject } from "./deck-types";
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

  test("uses an App Server strict response schema for live interview questions", () => {
    // Given
    const spec = interviewQuestionPlanJob({
      project: projectFixture(),
      jobManager: createProviderJobManager(),
    });

    // When
    const looseObjectPaths = findLooseObjectSchemaPaths(spec.turnRequest.outputSchema);

    // Then
    expect(looseObjectPaths).toEqual([]);
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
  return {
    core: {
      invoke: async (command) => {
        calls.push(command);
        const threadId = "thread_desktop_interview";
        const turnId = `turn_${artifactId}`;
        return {
          runtime: "codex app-server --stdio",
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
                item: { type: "agentMessage", text: JSON.stringify(payload) },
              },
            },
            { method: "turn/completed", params: { threadId, turn: { id: turnId } } },
          ],
        };
      },
    },
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

function findLooseObjectSchemaPaths(value: unknown, path = "$"): readonly string[] {
  if (!isRecord(value)) return [];

  const ownIssues =
    value["type"] === "object" && value["additionalProperties"] !== false ? [path] : [];
  const properties = value["properties"];
  const propertyIssues = isRecord(properties)
    ? Object.entries(properties).flatMap(([key, child]) =>
        findLooseObjectSchemaPaths(child, `${path}.properties.${key}`),
      )
    : [];
  const itemIssues =
    value["type"] === "array" ? findLooseObjectSchemaPaths(value["items"], `${path}.items`) : [];

  return [...ownIssues, ...propertyIssues, ...itemIssues];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
