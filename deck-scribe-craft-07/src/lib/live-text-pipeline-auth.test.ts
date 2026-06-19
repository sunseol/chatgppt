import { describe, expect, test } from "bun:test";
import type { DeckPlan, DesignSystem, SlideSpec } from "./deck-types";
import { generateDesignSystemFromPlan } from "./design-system-generator";
import { createLayoutIrFromPlan } from "./layout-ir";
import {
  evaluateLiveTextPipelineCutover,
  type LiveTextPipelineCutoverInput,
} from "./live-text-pipeline-cutover";
import {
  createProviderArtifactProvenance,
  type ProviderArtifactProvenance,
} from "./provider-provenance";

describe("live text pipeline Codex session provenance", () => {
  test("accepts the desktop text pipeline prompt versions", () => {
    const input = completeInput();

    const result = evaluateLiveTextPipelineCutover({
      ...input,
      deckPlan: {
        ...input.deckPlan,
        provenance: liveCodexProvenance("deck_plan_live_1", "turn_plan", "deck_plan_desktop@v1", [
          "brief_live_1",
          "research_live_1",
        ]),
      },
      designSystem: {
        ...input.designSystem,
        provenance: liveCodexProvenance(
          "design_system_live_1",
          "turn_design",
          "design_system_desktop@v1",
          ["deck_plan_live_1"],
        ),
      },
      layoutIr: {
        ...input.layoutIr,
        provenance: liveCodexProvenance("layout_ir_live_1", "turn_layout", "layout_ir_desktop@v1", [
          "deck_plan_live_1",
          "design_system_live_1",
        ]),
      },
    });

    expect(result.kind).toBe("ready");
  });

  test("blocks text pipeline artifacts generated with a stage-wrong prompt", () => {
    const input = completeInput();

    const result = evaluateLiveTextPipelineCutover({
      ...input,
      layoutIr: {
        ...input.layoutIr,
        provenance: liveCodexProvenance("layout_ir_live_1", "turn_layout", "deck_plan@v1", [
          "deck_plan_live_1",
          "design_system_live_1",
        ]),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(
      result.issues.map((issue) => issue.code).includes("text_pipeline_prompt_version_mismatch"),
    ).toBe(true);
  });

  test("blocks text turns that do not use the authenticated Codex session", () => {
    const input = completeInput();

    const result = evaluateLiveTextPipelineCutover({
      ...input,
      designSystem: {
        ...input.designSystem,
        provenance: liveCodexProvenance(
          "design_system_live_1",
          "turn_design",
          "design_system@v1",
          ["deck_plan_live_1"],
          "none",
        ),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code).includes("non_codex_session_auth")).toBe(true);
  });

  test("blocks deck plan turns that omit the approved research pack input", () => {
    const input = completeInput();

    const result = evaluateLiveTextPipelineCutover({
      ...input,
      deckPlan: {
        ...input.deckPlan,
        provenance: liveCodexProvenance("deck_plan_live_1", "turn_plan", "deck_plan@v1", [
          "brief_live_1",
        ]),
      },
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code).includes("missing_research_input")).toBe(true);
  });
});

function completeInput(): LiveTextPipelineCutoverInput {
  const plan: DeckPlan = {
    id: "plan_live_1",
    markdown: markdownForSlides(slides()),
    slides: slides(),
    approvedHash: "hash_plan",
  };
  const generated = generateDesignSystemFromPlan({
    brief: {
      id: "brief_live_1",
      goal: "투자 유치용 피치덱",
      audience: "초기 VC 및 투자자",
      desiredOutcome: "후속 미팅",
      slideCount: 5,
      aspectRatio: "16:9",
      language: "ko",
      tone: ["전문적"],
      mustInclude: ["문제 정의", "시장", "솔루션"],
      mustAvoid: ["출처 없는 시장 규모"],
      successCriteria: ["후속 미팅 요청"],
      openQuestions: [],
      approvedHash: "hash_brief",
    },
    plan,
  });
  if (generated.kind !== "ready") throw new Error("Expected a valid design system.");
  const design: DesignSystem = { ...generated.design, approvedHash: "hash_design" };
  const layoutIr = createLayoutIrFromPlan({ plan, design });
  return {
    approvedBriefArtifactId: "brief_live_1",
    approvedResearchPackArtifactId: "research_live_1",
    deckContextId: "deckctx_214",
    expectedSlideCount: 5,
    deckPlan: {
      artifact: plan,
      provenance: liveCodexProvenance("deck_plan_live_1", "turn_plan", "deck_plan@v1", [
        "brief_live_1",
        "research_live_1",
      ]),
      deckContextId: "deckctx_214",
    },
    designSystem: {
      artifact: design,
      provenance: liveCodexProvenance("design_system_live_1", "turn_design", "design_system@v1", [
        "deck_plan_live_1",
      ]),
      deckContextId: "deckctx_214",
    },
    layoutIr: {
      artifact: layoutIr,
      provenance: liveCodexProvenance("layout_ir_live_1", "turn_layout", "layout_ir@v1", [
        "deck_plan_live_1",
        "design_system_live_1",
      ]),
      deckContextId: "deckctx_214",
    },
    slideContextRefs: plan.slides.map((slide) => ({
      slideNumber: slide.number,
      deckContextId: "deckctx_214",
      designSystemId: design.id,
    })),
    repairAttempts: [],
  };
}

function liveCodexProvenance(
  artifactId: string,
  turnId: string,
  promptVersion: string,
  inputArtifactIds: readonly string[],
  authMode: ProviderArtifactProvenance["authMode"] = "codex_session",
): ProviderArtifactProvenance {
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode,
    modelOrRuntime: "codex-cli 0.141.0",
    promptVersion,
    durationMs: 2600,
    inputArtifactIds,
    fixture: false,
    threadId: "thread_text_pipeline_1",
    turnId,
  });
}

function slides(): SlideSpec[] {
  return [1, 2, 3, 4, 5].map((number) => ({
    number,
    title: `슬라이드 ${number}`,
    role: number === 1 ? "Cover" : "Proof",
    coreMessage: "검증 가능한 제작 자동화의 가치를 설명한다.",
    bodyPoints: ["핵심 포인트", "근거 요약"],
    visualType: "키 메시지",
    visualComposition: "키 메시지",
    evidence: number === 2 ? ["claim_001"] : [],
    editableElements: ["제목", "본문", "캡션"],
    dataSourceConstraints: number === 2 ? ["claim_001"] : ["구조 슬라이드"],
  }));
}

function markdownForSlides(items: readonly SlideSpec[]): string {
  return [
    "# Deck Plan",
    "",
    ...items.flatMap((item) => [
      `## Slide ${item.number}. ${item.title}`,
      `- role: ${item.role}`,
      `- core message: ${item.coreMessage}`,
      `- body points: ${item.bodyPoints?.join(", ")}`,
      `- visual direction: ${item.visualComposition}`,
      `- evidence: ${item.evidence.length > 0 ? item.evidence.join(", ") : "none"}`,
      `- editable elements: ${item.editableElements.join(", ")}`,
      `- data/source constraints: ${item.dataSourceConstraints?.join(", ")}`,
      "",
    ]),
  ].join("\n");
}
