import { describe, expect, test } from "bun:test";
import { collectCodexAppServerTaskEvents } from "./codex-app-server-event-mapper";
import { runStructuredCodexJob } from "./codex-app-server-event-runner";
import { createProviderJobManager } from "./provider-job-manager";
import type { StructuredCodexParser } from "./codex-structured-task-runner";

type StructuredProbe = {
  readonly artifact: string;
  readonly stage: string;
  readonly mock: boolean;
  readonly fixture: boolean;
  readonly status: string;
};

const parseStructuredProbe: StructuredCodexParser<StructuredProbe> = (value) => {
  if (!isRecord(value)) return { kind: "invalid", issues: ["object required"] };
  const artifact = value["artifact"];
  const stage = value["stage"];
  const mock = value["mock"];
  const fixture = value["fixture"];
  const status = value["status"];
  if (
    typeof artifact !== "string" ||
    typeof stage !== "string" ||
    typeof mock !== "boolean" ||
    typeof fixture !== "boolean" ||
    typeof status !== "string"
  ) {
    return { kind: "invalid", issues: ["structured probe fields required"] };
  }
  return { kind: "valid", value: { artifact, stage, mock, fixture, status } };
};

describe("Codex App Server event mapper", () => {
  test("maps a live JSON-RPC structured probe stream into a succeeded provider job", async () => {
    const mapping = collectCodexAppServerTaskEvents({
      runtime: "codex-app-server 0.141.0",
      promptVersion: "deckforge_structured_probe@v1",
      durationMs: 2_856,
      inputArtifactIds: ["brief_001"],
      notifications: [
        {
          method: "turn/started",
          params: {
            threadId: "019edb09-7568-70e2-a74c-5f2cc47e48fc",
            turn: { id: "019edb09-77f6-7332-a8d1-e9f6240bf331" },
          },
        },
        {
          method: "item/agentMessage/delta",
          params: {
            threadId: "019edb09-7568-70e2-a74c-5f2cc47e48fc",
            turnId: "019edb09-77f6-7332-a8d1-e9f6240bf331",
            delta:
              '{"artifact":"deckforge_live_structured_probe","stage":"health_structured_turn",',
          },
        },
        {
          method: "item/completed",
          params: {
            threadId: "019edb09-7568-70e2-a74c-5f2cc47e48fc",
            turnId: "019edb09-77f6-7332-a8d1-e9f6240bf331",
            item: {
              type: "agentMessage",
              text: '{"artifact":"deckforge_live_structured_probe","stage":"health_structured_turn","mock":false,"fixture":false,"status":"ok"}',
            },
          },
        },
        {
          method: "turn/completed",
          params: {
            threadId: "019edb09-7568-70e2-a74c-5f2cc47e48fc",
            turn: {
              id: "019edb09-77f6-7332-a8d1-e9f6240bf331",
              status: "completed",
            },
          },
        },
      ],
    });
    const manager = createProviderJobManager({ createId: () => "job_live_structured_probe" });

    const completed = await runStructuredCodexJob({
      jobManager: manager,
      capability: "deckPlan",
      description: "Map live structured probe",
      artifactId: "probe_live_001",
      parse: parseStructuredProbe,
      events: eventStream(mapping.events),
    });

    expect(mapping.issues).toEqual([]);
    expect(completed.status).toBe("succeeded");
    expect(completed.output?.value.mock).toBe(false);
    expect(completed.output?.value.fixture).toBe(false);
    expect(completed.output?.provenance.threadId).toBe("019edb09-7568-70e2-a74c-5f2cc47e48fc");
    expect(completed.output?.provenance.turnId).toBe("019edb09-77f6-7332-a8d1-e9f6240bf331");
    expect(completed.output?.provenance.inputArtifactIds).toEqual(["brief_001"]);
  });

  test("maps current App Server nested error notifications into a failed event", () => {
    const mapping = collectCodexAppServerTaskEvents({
      runtime: "codex-app-server 0.141.0",
      promptVersion: "interview_questions_desktop@v1",
      durationMs: 4_100,
      inputArtifactIds: ["project_001"],
      notifications: [
        {
          method: "turn/started",
          params: {
            threadId: "thread_live_schema_error",
            turn: { id: "turn_live_schema_error" },
          },
        },
        {
          method: "error",
          params: {
            error: {
              message:
                "Invalid schema for response_format 'codex_output_schema': additionalProperties is required to be false.",
              codexErrorInfo: "other",
              additionalDetails: null,
            },
            willRetry: false,
            threadId: "thread_live_schema_error",
            turnId: "turn_live_schema_error",
          },
        },
        {
          method: "turn/completed",
          params: {
            threadId: "thread_live_schema_error",
            turn: {
              id: "turn_live_schema_error",
              status: "failed",
              error: {
                message:
                  "Invalid schema for response_format 'codex_output_schema': additionalProperties is required to be false.",
              },
            },
          },
        },
      ],
    });

    expect(mapping.issues).toEqual([]);
    const failedEvent = mapping.events.find((event) => event.kind === "failed");
    expect(failedEvent).toEqual({
      kind: "failed",
      threadId: "thread_live_schema_error",
      turnId: "turn_live_schema_error",
      message:
        "Invalid schema for response_format 'codex_output_schema': additionalProperties is required to be false.",
    });
  });
});

async function* eventStream<TEvent>(events: readonly TEvent[]): AsyncIterable<TEvent> {
  for (const event of events) yield event;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
