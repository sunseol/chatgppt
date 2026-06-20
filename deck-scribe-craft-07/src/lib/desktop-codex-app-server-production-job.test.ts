import { describe, expect, test } from "bun:test";
import { runDesktopProductionCodexAppServerJob } from "./desktop-codex-app-server-production-job";
import { createProviderJobManager } from "./provider-job-manager";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";
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

describe("desktop production Codex App Server job", () => {
  test("runs Tauri structured turn notifications through the production job adapter", async () => {
    const outputSchema = {
      type: "object",
      required: ["title", "slideCount", "mock", "fixture"],
      properties: {
        title: { type: "string" },
        slideCount: { type: "number" },
        mock: { type: "boolean" },
        fixture: { type: "boolean" },
      },
    };
    const runtime: DeckforgeTauriRuntime = {
      core: {
        invoke: async () => ({
          runtime: "codex app-server --stdio",
          threadId: "thread_live_production",
          turnId: "turn_live_brief",
          turnCompleted: true,
          durationMs: 3_200,
          protocolLineCount: 5,
          stderrLogLineCount: 0,
          eventMethods: ["turn/started", "item/completed", "turn/completed"],
          notifications: [
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
          ],
        }),
      },
    };
    const manager = createProviderJobManager({ createId: () => "job_desktop_live_text" });

    const completed = await runDesktopProductionCodexAppServerJob({
      tauriRuntime: runtime,
      turnRequest: {
        prompt: "Create the live brief JSON.",
        outputSchema,
        model: "gpt-5.4",
        networkAccess: false,
      },
      jobManager: manager,
      capability: "interview",
      description: "Create live interview brief",
      artifactId: "brief_live_001",
      parse: parseBriefProbe,
      promptVersion: "interview_brief@v1",
      inputArtifactIds: ["interview_answers_001"],
    });

    expect(completed.status).toBe("succeeded");
    expect(completed.output?.value.title).toBe("Live brief");
    expect(completed.output?.provenance.modelOrRuntime).toBe("codex app-server --stdio");
    expect(completed.output?.provenance.durationMs).toBe(3_200);
    expect(completed.output?.provenance.threadId).toBe("thread_live_production");
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
