import { describe, expect, test } from "bun:test";
import {
  runDesktopLiveTextPipelineProductionWorkflow,
  type DesktopLiveTextPipelineWorkflowResult,
} from "./desktop-live-text-pipeline-workflow";
import { deckPlanJob, designSystemJob, layoutIrJob } from "./desktop-live-text-pipeline-jobs";
import { completeBrief, pipelineFixtures } from "./live-text-artifact-persistence.fixtures";
import { liveApprovedResearchPackFixture } from "./live-research-approval-test-fixtures";
import { createProviderJobManager } from "./provider-job-manager";
import type { DeckProject } from "./deck-types";
import type { DeckforgeTauriRuntime } from "./desktop-app-server-bridge";

describe("desktop live text pipeline workflow", () => {
  test("runs desktop structured turns for plan, design, and layout before persisting the bundle", async () => {
    // Given
    const fixtures = pipelineFixtures();
    const calls: string[] = [];
    const runtime = structuredTurnRuntime(
      [
        { artifactId: "deck_plan_live_desktop", payload: { markdown: fixtures.plan.markdown } },
        { artifactId: "design_system_live_desktop", payload: fixtures.design },
        { artifactId: "layout_ir_live_desktop", payload: fixtures.layoutIr },
      ],
      calls,
    );

    // When
    const result = await runDesktopLiveTextPipelineProductionWorkflow({
      project: projectFixture(),
      jobManager: createProviderJobManager({ createId: sequentialIds("job_desktop_text") }),
      tauriRuntime: runtime,
      createdAt: 1_789_340_000_000,
    });

    // Then
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(calls).toEqual([
      "deckforge_codex_app_server_structured_turn",
      "deckforge_codex_app_server_structured_turn",
      "deckforge_codex_app_server_structured_turn",
    ]);
    expect(result.patch.stage).toBe("LAYOUT_APPROVAL_PENDING");
    expect(result.patch.plan.slides.length).toBe(5);
    expect(result.patch.design.id).toBe(fixtures.design.id);
    expect(result.patch.layout.slides.length).toBe(5);
    expect(result.provenanceLineage.map((item) => item.turnId)).toEqual([
      "turn_deck_plan_live_desktop",
      "turn_design_system_live_desktop",
      "turn_layout_ir_live_desktop",
    ]);
  });

  test("blocks launch before desktop turns when approved brief or research is missing", async () => {
    // Given
    const manager = createProviderJobManager({ createId: sequentialIds("job_blocked") });

    // When
    const result = await runDesktopLiveTextPipelineProductionWorkflow({
      project: projectFixture({ brief: undefined }),
      jobManager: manager,
      tauriRuntime: structuredTurnRuntime([], []),
      createdAt: 1_789_340_000_000,
    });

    // Then
    expect(result.kind).toBe("launch_blocked");
    if (result.kind !== "launch_blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_live_brief"]);
    expect(manager.snapshot()).toEqual([]);
  });

  test("uses App Server strict response schemas for every live text pipeline stage", () => {
    // Given
    const fixtures = pipelineFixtures();
    const context = {
      project: projectFixture(),
      jobManager: createProviderJobManager(),
    };
    const jobs = [
      ["deck_plan", deckPlanJob(context)],
      ["design_system", designSystemJob(context, "deckctx_schema_check", fixtures.plan)],
      ["layout_ir", layoutIrJob(context, "Return a Layout IR JSON object.")],
    ] as const;

    // When
    const looseObjectPaths = jobs.flatMap(([stage, job]) =>
      findLooseObjectSchemaPaths(job.turnRequest.outputSchema).map((path) => `${stage}:${path}`),
    );

    // Then
    expect(looseObjectPaths).toEqual([]);
  });

  test("passes the approved Research Pack hash into the Deck Plan turn", () => {
    // Given
    const job = deckPlanJob({
      project: projectFixture(),
      jobManager: createProviderJobManager(),
    });

    // Then
    expect(job.inputArtifactIds).toEqual(["brief_live_1", "research_live_desktop"]);
    expect(job.turnRequest.prompt.includes("researchPackId: research_live_desktop")).toBe(true);
    expect(
      job.turnRequest.prompt.includes("approvedResearchPackHash: sha256:research-live-desktop"),
    ).toBe(true);
  });
});

function structuredTurnRuntime(
  turns: readonly { readonly artifactId: string; readonly payload: unknown }[],
  calls: string[],
): DeckforgeTauriRuntime {
  let index = 0;
  return {
    core: {
      invoke: async (command) => {
        calls.push(command);
        const turn = turns[index];
        index += 1;
        if (turn === undefined) {
          throw { code: "unexpected_turn", message: "No structured turn fixture is available." };
        }
        return turnEvidence(turn.artifactId, turn.payload);
      },
    },
  };
}

function turnEvidence(artifactId: string, payload: unknown) {
  const threadId = "thread_desktop_text_pipeline";
  const turnId = `turn_${artifactId}`;
  return {
    runtime: "codex app-server --stdio",
    threadId,
    turnId,
    turnCompleted: true,
    durationMs: 2_400,
    protocolLineCount: 5,
    stderrLogLineCount: 0,
    eventMethods: ["turn/started", "item/completed", "turn/completed"],
    notifications: [
      { method: "turn/started", params: { threadId, turn: { id: turnId } } },
      {
        method: "item/completed",
        params: { threadId, turnId, item: { type: "agentMessage", text: JSON.stringify(payload) } },
      },
      { method: "turn/completed", params: { threadId, turn: { id: turnId } } },
    ],
  };
}

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_desktop_text_pipeline",
    name: "Desktop Text Pipeline",
    initialPrompt: "임원 보고 덱",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "PLANNING",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    brief: { ...completeBrief(), approvedHash: "sha256:brief-live-desktop" },
    research: liveApprovedResearchPackFixture(),
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
