import { describe, expect, test } from "bun:test";
import type { DeckProject } from "./deck-types";
import { createFrozenDeckContext } from "./deck-context";
import { buildSlideContextBundles } from "./slide-context-bundle";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "./mock-ai";
import { buildSlidePromptPackage } from "./slide-prompt-package";

describe("slide context bundle", () => {
  test("creates one bundle per slide with shared frozen context references", () => {
    const { project, context } = approvedFixture();
    const result = buildSlideContextBundles({ project, context });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.bundles.length).toBe(8);
    expect(result.bundles.every((bundle) => bundle.deckContextId === context.deckContextId)).toBe(
      true,
    );
    expect(result.bundles.every((bundle) => bundle.deckContextHash === context.hash)).toBe(true);
  });

  test("includes slide source map and facts", () => {
    const { project, context } = approvedFixture();
    const result = buildSlideContextBundles({ project, context });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    const bundle = result.bundles.find((item) => item.slideSpec.slideNumber === 3);

    expect(bundle?.sourceMap.claimIds).toEqual(["claim_001", "claim_002"]);
    expect(bundle?.sourceMap.datasetIds).toEqual(["dataset_001", "dataset_002"]);
    expect(bundle?.facts.map((fact) => fact.claimId)).toEqual(["claim_001", "claim_002"]);
    expect(bundle?.designTokens.negativeRules.includes("출처 없는 수치 시각화 금지")).toBe(true);
  });

  test("does not include original conversation prompt text", () => {
    const { project, context } = approvedFixture();
    const result = buildSlideContextBundles({ project, context });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(JSON.stringify(result.bundles).includes(project.initialPrompt)).toBe(false);
  });

  test("excludes source-less numeric claims from image generation facts", () => {
    const project = approvedProjectWithUnsafeNumericClaim();
    const contextResult = createFrozenDeckContext(project, { now: () => 1_789_500_000 });
    if (contextResult.kind !== "ready") throw new Error("Expected approved fixture context.");

    const result = buildSlideContextBundles({ project, context: contextResult.context });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    const bundle = result.bundles.find((item) => item.slideSpec.slideNumber === 3);
    if (!bundle) throw new Error("Expected slide 3 bundle.");

    const promptPackage = buildSlidePromptPackage(bundle);
    expect(bundle.sourceMap.sourceMapIds.includes("claim_bad")).toBe(false);
    expect(bundle.facts.map((fact) => fact.claimId).includes("claim_bad")).toBe(false);
    expect(promptPackage.prompt.includes("claim_bad")).toBe(false);
  });

  test("matches required first bundle snapshot fields", () => {
    const { context, project } = approvedFixture();
    const result = buildSlideContextBundles({ project, context });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    const first = result.bundles[0];

    if (!first) throw new Error("Expected first slide context bundle.");
    expect({
      deckContextId: first.deckContextId,
      deckContextHash: first.deckContextHash,
      slideNumber: first.slideSpec.slideNumber,
      title: first.slideSpec.title,
      layoutScreenshot: first.layoutPrototype.layoutScreenshot,
      domLayerCount: first.layoutPrototype.domLayers.length,
      sourceMapIds: first.sourceMap.sourceMapIds,
      tone: first.globalSummary.tone,
    }).toEqual({
      deckContextId: context.deckContextId,
      deckContextHash: context.hash,
      slideNumber: 1,
      title: "검증 가능한 AI 슬라이드 제작 시스템",
      layoutScreenshot: "slide_01_layout.png",
      domLayerCount: 3,
      sourceMapIds: [],
      tone: ["전문적", "신뢰감 있는", "절제된 모던"],
    });
  });
});

function approvedFixture() {
  const project = approvedProject();
  const contextResult = createFrozenDeckContext(project, { now: () => 1_789_500_000 });
  if (contextResult.kind !== "ready") throw new Error("Expected approved fixture context.");
  return { project, context: contextResult.context };
}

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Approved frozen context goal", 8, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Slide Context",
    initialPrompt: "User original conversation prompt that must stay out",
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

function approvedProjectWithUnsafeNumericClaim(): DeckProject {
  const project = approvedProject();
  const research = project.research;
  const plan = project.plan;
  if (!research || !plan) throw new Error("Expected approved project research and plan.");

  const baseClaim = research.claims[0];
  if (!baseClaim) throw new Error("Expected at least one research claim.");

  return {
    ...project,
    research: {
      ...research,
      claims: [
        ...research.claims,
        {
          ...baseClaim,
          id: "claim_bad",
          statement: "출처 없는 99% 수치",
          sourceIds: [],
          datasetIds: [],
          confidence: "assumption",
          hasNumber: true,
          needsUserReview: true,
          status: "assumption",
          slideCandidates: [3],
          numericEvidence: [],
        },
      ],
    },
    plan: {
      ...plan,
      slides: plan.slides.map((slide) =>
        slide.number === 3
          ? {
              ...slide,
              evidence: [...slide.evidence, "claim_bad"],
              dataSourceConstraints: [...(slide.dataSourceConstraints ?? []), "claim_bad"],
            }
          : slide,
      ),
    },
  };
}
