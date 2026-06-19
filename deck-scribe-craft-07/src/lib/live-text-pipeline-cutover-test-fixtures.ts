import type { DeckPlan, DesignSystem, InterviewBrief, SlideSpec } from "./deck-types";
import { generateDesignSystemFromPlan } from "./design-system-generator";
import { createLayoutIrFromPlan, type LayoutIR } from "./layout-ir";
import type {
  LiveTextPipelineCutoverInput,
  LiveTextPipelineSlideContextRef,
} from "./live-text-pipeline-cutover";
import {
  createProviderArtifactProvenance,
  type ProviderArtifactProvenance,
} from "./provider-provenance";

export const APPROVED_BRIEF_ARTIFACT_ID = "brief_live_1";
export const APPROVED_RESEARCH_PACK_ARTIFACT_ID = "research_live_1";

export function completePipelineInput(
  fixtures: ReturnType<typeof completePipelineFixtures>,
): LiveTextPipelineCutoverInput {
  return {
    approvedBriefArtifactId: APPROVED_BRIEF_ARTIFACT_ID,
    approvedResearchPackArtifactId: APPROVED_RESEARCH_PACK_ARTIFACT_ID,
    deckContextId: "deckctx_214",
    expectedSlideCount: 5,
    deckPlan: {
      artifact: fixtures.plan,
      provenance: liveCodexProvenance("deck_plan_live_1", "turn_plan", "deck_plan@v1", [
        APPROVED_BRIEF_ARTIFACT_ID,
        APPROVED_RESEARCH_PACK_ARTIFACT_ID,
      ]),
      deckContextId: "deckctx_214",
    },
    designSystem: {
      artifact: fixtures.design,
      provenance: liveCodexProvenance("design_system_live_1", "turn_design", "design_system@v1", [
        "deck_plan_live_1",
      ]),
      deckContextId: "deckctx_214",
    },
    layoutIr: {
      artifact: fixtures.layoutIr,
      provenance: liveCodexProvenance("layout_ir_live_1", "turn_layout", "layout_ir@v1", [
        "deck_plan_live_1",
        "design_system_live_1",
      ]),
      deckContextId: "deckctx_214",
    },
    slideContextRefs: fixtures.slideContextRefs,
    repairAttempts: [],
  };
}

export function completePipelineFixtures(): {
  readonly plan: DeckPlan;
  readonly design: DesignSystem;
  readonly layoutIr: LayoutIR;
  readonly slideContextRefs: readonly LiveTextPipelineSlideContextRef[];
} {
  const plan: DeckPlan = {
    id: "plan_live_1",
    markdown: markdownForSlides(slides()),
    slides: slides(),
    approvedHash: "hash_plan",
  };
  const generated = generateDesignSystemFromPlan({ brief: brief(), plan });
  if (generated.kind !== "ready") throw new Error("Expected valid design fixture.");
  const design = { ...generated.design, approvedHash: "hash_design" };
  const layoutIr = createLayoutIrFromPlan({ plan, design });
  return {
    plan,
    design,
    layoutIr,
    slideContextRefs: plan.slides.map((slide) => ({
      slideNumber: slide.number,
      deckContextId: "deckctx_214",
      designSystemId: design.id,
    })),
  };
}

export function liveCodexProvenance(
  artifactId: string,
  turnId: string,
  promptVersion: string,
  inputArtifactIds: readonly string[],
): ProviderArtifactProvenance {
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex-cli 0.141.0",
    promptVersion,
    durationMs: 2600,
    inputArtifactIds,
    fixture: false,
    threadId: "thread_text_pipeline_1",
    turnId,
  });
}

function brief(): InterviewBrief {
  return {
    id: APPROVED_BRIEF_ARTIFACT_ID,
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
  };
}

function slides(): SlideSpec[] {
  return [
    slide(1, "문제 정의", "Cover", "AI PPT 제작은 검증과 편집에서 병목이 생긴다.", []),
    slide(2, "시장 기회", "Market", "검증 가능한 제작 자동화 수요가 커지고 있다.", ["claim_001"]),
    slide(3, "솔루션", "Solution", "DeckForge는 승인 게이트로 품질을 제어한다.", []),
    slide(4, "검증 체계", "Proof", "출처와 편집성을 함께 보존한다.", ["claim_002"]),
    slide(5, "다음 단계", "Closing", "후속 미팅에서 파일럿 범위를 확정한다.", []),
  ];
}

function slide(
  number: number,
  title: string,
  role: string,
  coreMessage: string,
  evidence: readonly string[],
): SlideSpec {
  return {
    number,
    title,
    role,
    coreMessage,
    bodyPoints: ["핵심 포인트", "근거 요약"],
    visualType: number === 2 ? "막대 차트 + 인사이트" : "키 메시지",
    visualComposition: number === 2 ? "막대 차트 + 인사이트" : "키 메시지",
    evidence: [...evidence],
    editableElements: ["제목", "본문", "캡션"],
    dataSourceConstraints: evidence.length > 0 ? [...evidence] : ["구조 슬라이드"],
  };
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
