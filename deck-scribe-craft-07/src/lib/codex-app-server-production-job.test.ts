import { describe, expect, test } from "bun:test";
import { runProductionCodexAppServerJob } from "./codex-app-server-production-job";
import { createProviderJobManager } from "./provider-job-manager";
import type { CodexAppServerJsonRpcNotification } from "./codex-app-server-event-mapper";
import type { StructuredCodexParser } from "./codex-structured-task-runner";

type BriefProbe = {
  readonly title: string;
  readonly slideCount: number;
  readonly mock: boolean;
  readonly fixture: boolean;
};

const parseBriefProbe: StructuredCodexParser<BriefProbe> = (value) => {
  if (!isRecord(value)) return { kind: "invalid", issues: ["object required"] };
  const title = value["title"];
  const slideCount = value["slideCount"];
  const mock = value["mock"];
  const fixture = value["fixture"];
  if (
    typeof title !== "string" ||
    typeof slideCount !== "number" ||
    typeof mock !== "boolean" ||
    typeof fixture !== "boolean"
  ) {
    return { kind: "invalid", issues: ["brief probe fields required"] };
  }
  return { kind: "valid", value: { title, slideCount, mock, fixture } };
};

describe("production Codex App Server job", () => {
  test("runs mapped App Server notifications through the Job Manager and persists provenance", async () => {
    const manager = createProviderJobManager({ createId: () => "job_production_live_text" });

    const completed = await runProductionCodexAppServerJob({
      jobManager: manager,
      capability: "interview",
      description: "Create live interview brief",
      artifactId: "brief_live_001",
      parse: parseBriefProbe,
      runtime: "codex-app-server 0.141.0",
      promptVersion: "interview_brief@v1",
      durationMs: 3_200,
      inputArtifactIds: ["interview_answers_001"],
      notifications: notificationStream([
        {
          method: "turn/started",
          params: {
            threadId: "thread_live_production",
            turn: { id: "turn_live_brief" },
          },
        },
        {
          method: "item/completed",
          params: {
            threadId: "thread_live_production",
            turnId: "turn_live_brief",
            item: {
              type: "agentMessage",
              text: '{"title":"Live brief","slideCount":5,"mock":false,"fixture":false}',
            },
          },
        },
        {
          method: "turn/completed",
          params: {
            threadId: "thread_live_production",
            turn: { id: "turn_live_brief", status: "completed" },
          },
        },
      ]),
    });

    expect(completed.status).toBe("succeeded");
    expect(completed.output?.value).toEqual({
      title: "Live brief",
      slideCount: 5,
      mock: false,
      fixture: false,
    });
    expect(completed.output?.provenance.providerKind).toBe("codex");
    expect(completed.output?.provenance.threadId).toBe("thread_live_production");
    expect(completed.output?.provenance.turnId).toBe("turn_live_brief");
    expect(manager.snapshot().length).toBe(1);
  });
});

async function* notificationStream(
  notifications: readonly CodexAppServerJsonRpcNotification[],
): AsyncIterable<CodexAppServerJsonRpcNotification> {
  for (const notification of notifications) yield notification;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
