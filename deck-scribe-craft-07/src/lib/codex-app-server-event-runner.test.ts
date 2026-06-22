import { describe, expect, test } from "bun:test";
import { runStructuredCodexJob } from "./codex-app-server-event-runner";
import { createProviderJobManager, type ProviderJobManager } from "./provider-job-manager";
import type { StructuredCodexParser } from "./codex-structured-task-runner";

type DeckPlanShape = {
  readonly title: string;
  readonly slideCount: number;
};

const parseDeckPlan: StructuredCodexParser<DeckPlanShape> = (value) => {
  if (!isRecord(value)) return { kind: "invalid", issues: ["object required"] };
  const title = value["title"];
  const slideCount = value["slideCount"];
  if (typeof title !== "string" || typeof slideCount !== "number") {
    return { kind: "invalid", issues: ["title and slideCount required"] };
  }
  return { kind: "valid", value: { title, slideCount } };
};

describe("Codex App Server structured event runner", () => {
  test("maps progress approval partial and completion events into a succeeded job", async () => {
    // Given
    const manager = createProviderJobManager({ createId: () => "job_structured" });

    // When
    const completed = await runStructuredCodexJob({
      jobManager: manager,
      capability: "deckPlan",
      description: "Create live deck plan",
      artifactId: "plan_live_001",
      parse: parseDeckPlan,
      events: eventStream([
        { kind: "turn_started", threadId: "thread_001", turnId: "turn_001" },
        {
          kind: "progress",
          threadId: "thread_001",
          turnId: "turn_001",
          percent: 30,
          message: "Planning",
        },
        {
          kind: "approval_requested",
          threadId: "thread_001",
          turnId: "turn_001",
          message: "Approve plan?",
        },
        {
          kind: "partial",
          threadId: "thread_001",
          turnId: "turn_001",
          text: '{"title":"partial"}',
        },
        {
          kind: "completed",
          threadId: "thread_001",
          turnId: "turn_001",
          payload: { title: "Live plan", slideCount: 5 },
          runtime: "codex-app-server 0.141.0",
          promptVersion: "deck_plan@v1",
          durationMs: 1_250,
          inputArtifactIds: ["research_001"],
        },
      ]),
    });

    // Then
    expect(completed.status).toBe("succeeded");
    expect(completed.progress).toEqual({
      percent: 90,
      message: "Approval requested: Approve plan?",
    });
    expect(completed.partialResult).toEqual({
      kind: "codex_partial",
      text: '{"title":"partial"}',
      threadId: "thread_001",
      turnId: "turn_001",
    });
    expect(completed.output?.provenance.turnId).toBe("turn_001");
    expect(completed.output?.provenance.threadId).toBe("thread_001");
  });

  test("maps cancellation during a turn into a cancelled job without accepting later output", async () => {
    // Given
    const manager = createProviderJobManager({ createId: () => "job_cancel_live" });

    // When
    const completed = await runStructuredCodexJob({
      jobManager: manager,
      capability: "layoutPrototype",
      description: "Create live layout",
      artifactId: "layout_live_001",
      parse: parseDeckPlan,
      events: cancellableEventStream(manager),
    });

    // Then
    expect(completed.status).toBe("cancelled");
    expect("output" in completed).toBe(false);
  });

  test("maps App Server failure and invalid schema completion into failed jobs", async () => {
    // Given
    const failureManager = createProviderJobManager({ createId: () => "job_failure" });
    const invalidManager = createProviderJobManager({ createId: () => "job_invalid" });

    // When
    const failed = await runStructuredCodexJob({
      jobManager: failureManager,
      capability: "interview",
      description: "Create live interview",
      artifactId: "interview_live_001",
      parse: parseDeckPlan,
      events: eventStream([
        { kind: "turn_started", threadId: "thread_failure", turnId: "turn_failure" },
        {
          kind: "failed",
          threadId: "thread_failure",
          turnId: "turn_failure",
          message: "model unavailable",
        },
      ]),
    });
    const invalid = await runStructuredCodexJob({
      jobManager: invalidManager,
      capability: "deckPlan",
      description: "Create live deck plan",
      artifactId: "plan_live_invalid",
      parse: parseDeckPlan,
      events: eventStream([
        { kind: "turn_started", threadId: "thread_invalid", turnId: "turn_invalid" },
        {
          kind: "completed",
          threadId: "thread_invalid",
          turnId: "turn_invalid",
          payload: { title: "Missing count" },
          runtime: "codex-app-server 0.141.0",
          promptVersion: "deck_plan@v1",
          durationMs: 900,
          inputArtifactIds: [],
        },
      ]),
    });

    // Then
    expect(failed.status).toBe("failed");
    expect(failed.errorMessage).toBe("Codex App Server event failed: model unavailable");
    expect(invalid.status).toBe("failed");
    expect(invalid.errorMessage).toBe(
      "Codex structured output rejected: schema_invalid: title and slideCount required",
    );
  });
});

async function* eventStream<TEvent>(events: readonly TEvent[]): AsyncIterable<TEvent> {
  for (const event of events) yield event;
}

async function* cancellableEventStream(manager: ProviderJobManager) {
  yield { kind: "turn_started" as const, threadId: "thread_cancel", turnId: "turn_cancel" };
  manager.requestCancellation("job_cancel_live");
  yield {
    kind: "completed" as const,
    threadId: "thread_cancel",
    turnId: "turn_cancel",
    payload: { title: "Should not be accepted", slideCount: 5 },
    runtime: "codex-app-server 0.141.0",
    promptVersion: "layout@v1",
    durationMs: 1_100,
    inputArtifactIds: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
