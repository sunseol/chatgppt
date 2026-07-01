import type { DeckPlan, DesignSystem, InterviewBrief, SlideSpec } from "./deck-types";
import { generateDesignSystemFromPlan } from "./design-system-generator";
import { createLayoutIrFromPlan, type LayoutIR } from "./layout-ir";
import { createProviderArtifactProvenance } from "./provider-provenance";
import type { ProviderArtifactProvenance } from "./provider-provenance";
import type { StructuredCodexAccepted } from "./codex-structured-task-runner";

export function accepted<TValue>(
  value: TValue,
  provenance: ProviderArtifactProvenance,
): StructuredCodexAccepted<TValue> {
  return { kind: "accepted", value, provenance };
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
    modelOrRuntime: "codex-app-server 0.141.0",
    promptVersion,
    durationMs: 2_400,
    inputArtifactIds,
    fixture: false,
    threadId: "thread_live_text",
    turnId,
  });
}

export function completeBrief(): InterviewBrief {
  return {
    id: "brief_live_1",
    goal: "성과 리뷰",
    audience: "임원",
    desiredOutcome: "예산 승인",
    slideCount: 5,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["절제된", "데이터 기반"],
    mustInclude: ["채널별 성과", "다음 분기 실행 계획"],
    mustAvoid: ["출처 없는 성과 과장"],
    successCriteria: ["승인 가능한 명확성"],
    openQuestions: [],
  };
}

export function pipelineFixtures(): {
  readonly plan: DeckPlan;
  readonly design: DesignSystem;
  readonly layoutIr: LayoutIR;
} {
  const planSlides = slides();
  const plan: DeckPlan = {
    id: "plan_live_1",
    markdown: markdownForSlides(planSlides),
    slides: [...planSlides],
    approvedHash: "hash_plan_live_1",
  };
  const generated = generateDesignSystemFromPlan({ brief: completeBrief(), plan });
  if (generated.kind !== "ready") throw new Error("Expected design fixture to be valid.");
  return {
    plan,
    design: generated.design,
    layoutIr: createLayoutIrFromPlan({ plan, design: generated.design }),
  };
}

function slides(): readonly SlideSpec[] {
  return [
    slide(1, "요약", "Cover", "성과와 의사결정 포인트를 요약한다.", []),
    slide(2, "채널 성과", "Market", "채널별 성과 차이를 비교한다.", ["claim_001"]),
    slide(3, "핵심 캠페인", "Proof", "성과를 만든 캠페인 요인을 분해한다.", ["claim_002"]),
    slide(4, "학습", "Insight", "다음 분기 예산에 반영할 학습을 정리한다.", []),
    slide(5, "다음 단계", "Closing", "승인 요청과 실행 계획을 제시한다.", []),
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
    visualType: number === 2 ? "막대 차트" : "키 메시지",
    visualComposition: number === 2 ? "막대 차트와 인사이트" : "키 메시지 중심",
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
