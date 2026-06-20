import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { createLiveTextPipelineReadyArtifactPatch } from "./desktop-live-text-pipeline-workflow";
import type { LiveTextArtifactRecord, LiveTextArtifactType } from "./live-text-artifact-record";
import { pipelineFixtures } from "./live-text-artifact-persistence.fixtures";

describe("desktop live text pipeline artifact patch", () => {
  test("preserves plan design and layout artifact records when the ready patch is applied", () => {
    const fixtures = pipelineFixtures();
    const project = projectFixture({
      liveTextArtifacts: [record("old_plan", "deck_plan")],
    });

    const patch = createLiveTextPipelineReadyArtifactPatch(
      project,
      {
        stage: "LAYOUT_APPROVAL_PENDING",
        plan: fixtures.plan,
        design: fixtures.design,
        layout: { id: "layout_ready", slides: [] },
      },
      [
        record("new_plan", "deck_plan"),
        record("new_design", "design_system"),
        record("new_layout", "layout_ir"),
      ],
    );

    expect(patch.stage).toBe("LAYOUT_APPROVAL_PENDING");
    expect(patch.plan.id).toBe("plan_live_1");
    expect(patch.design.id).toBe(fixtures.design.id);
    expect(patch.layout.id).toBe("layout_ready");
    expect(patch.liveTextArtifacts.map((artifact) => artifact.artifactId)).toEqual([
      "old_plan",
      "new_plan",
      "new_design",
      "new_layout",
    ]);
  });
});

function projectFixture(patch: Partial<DeckProject> = {}): DeckProject {
  return {
    id: "p_ready_text_pipeline",
    name: "Ready Text Pipeline",
    initialPrompt: "임원 보고 덱을 만들어줘.",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 5,
    stage: "DESIGN_APPROVAL_PENDING",
    createdAt: 1_789_300_000,
    updatedAt: 1_789_300_000,
    invalidated: {},
    approvalLog: [],
    ...patch,
  };
}

function record(artifactId: string, artifactType: LiveTextArtifactType): LiveTextArtifactRecord {
  return {
    artifactId,
    projectId: "p_ready_text_pipeline",
    artifactType,
    version: 1,
    hash: `sha256:${artifactId}`,
    path: `projects/p_ready_text_pipeline/${artifactId}.json`,
    createdAt: 1_789_350_000_000,
  };
}
