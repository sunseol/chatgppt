import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { createDeckContextPromptReferences, createFrozenDeckContext } from "./deck-context";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";

describe("frozen deck context", () => {
  test("creates a locked bundle with approved artifacts and layout DOM metadata", () => {
    const result = createFrozenDeckContext(approvedProject());

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.context.locked).toBe(true);
    expect(result.context.approvedArtifacts.briefId).toBe("brief_001");
    expect(result.context.approvedHashes.layoutHash).toBe("sha256:layout");
    expect(result.context.layout.layoutPrototypeId.startsWith("layout_")).toBe(true);
    expect(result.context.layout.slides.every((slide) => slide.domLayers.length > 0)).toBe(true);
  });

  test("creates stable ids and hashes for the same approved project", () => {
    const project = approvedProject();
    const first = createFrozenDeckContext(project);
    const second = createFrozenDeckContext(project);

    expect(first.kind).toBe("ready");
    expect(second.kind).toBe("ready");
    if (first.kind !== "ready" || second.kind !== "ready") return;
    expect(second.context.deckContextId).toBe(first.context.deckContextId);
    expect(second.context.hash).toBe(first.context.hash);
  });

  test("changes context id when an upstream approved hash changes", () => {
    const project = approvedProject();
    const plan = requirePlan(project);
    const changed = {
      ...project,
      plan: { ...plan, approvedHash: "sha256:plan-v2" },
    };
    const first = createFrozenDeckContext(project);
    const second = createFrozenDeckContext(changed);

    expect(first.kind).toBe("ready");
    expect(second.kind).toBe("ready");
    if (first.kind !== "ready" || second.kind !== "ready") return;
    expect(second.context.deckContextId === first.context.deckContextId).toBe(false);
  });

  test("blocks missing or unapproved artifacts", () => {
    const project = approvedProject();
    const layout = requireLayout(project);
    const result = createFrozenDeckContext({
      ...project,
      layout: { ...layout, approvedHash: undefined },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues).toEqual(["Approved layout prototype is required."]);
  });

  test("creates prompt references that share one deck context id", () => {
    const result = createFrozenDeckContext(approvedProject());

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    const refs = createDeckContextPromptReferences(result.context);

    expect(refs.length).toBe(8);
    expect(refs.every((ref) => ref.deckContextId === result.context.deckContextId)).toBe(true);
    expect(
      refs.every((ref) => ref.layoutPrototypeId === result.context.layout.layoutPrototypeId),
    ).toBe(true);
  });
});

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Frozen context pitch deck", 8, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Frozen Context",
    initialPrompt: "Create a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 8,
    stage: "GENERATING_SLIDES",
    createdAt: 1_789_500_000,
    updatedAt: 1_789_500_000,
    brief,
    research,
    plan,
    design,
    layout,
    invalidated: {},
    approvalLog: [],
  };
}

function requirePlan(project: DeckProject) {
  if (!project.plan) throw new Error("Expected approved project fixture to include a plan.");
  return project.plan;
}

function requireLayout(project: DeckProject) {
  if (!project.layout) throw new Error("Expected approved project fixture to include a layout.");
  return project.layout;
}
