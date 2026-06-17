import type {
  InterviewBrief,
  DeckPlan,
  DesignSystem,
  LayoutPrototype,
  GeneratedSlide,
  EditableLayerModel,
} from "./deck-types";
import { requireDesignSystemFromPlan } from "./design-system-generator";
import { renderLocalLayoutArtifacts } from "./layout-html-renderer";
import { validateLayoutArtifacts } from "./layout-validation";
import { createLayoutIrFromPlan } from "./layout-ir";

export { mockPlan } from "./mock-plan";
export { mockResearch } from "./mock-research";

const hash = (s: string) =>
  "sha256:" +
  Math.abs([...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))
    .toString(16)
    .padStart(8, "0");

export function mockBrief(
  prompt: string,
  slideCount: number,
  ratio: "16:9" | "4:3",
): InterviewBrief {
  return {
    id: "brief_" + Date.now().toString(36),
    goal: prompt.length > 60 ? prompt.slice(0, 60) + "…" : prompt,
    audience: "초기 단계 VC 및 산업 전문가",
    desiredOutcome:
      "5분 안에 문제의 크기와 솔루션의 차별성을 이해시키고 후속 미팅 요청을 이끌어낸다.",
    slideCount,
    aspectRatio: ratio,
    language: "ko",
    tone: ["전문적", "신뢰감 있는", "절제된 모던"],
    mustInclude: ["문제 정의", "시장 규모", "솔루션", "차별점", "비즈니스 모델"],
    mustAvoid: ["출처 없는 통계", "과장된 표현", "장식적 그래픽 남용"],
    successCriteria: [
      "투자자가 핵심 메시지를 한 문장으로 재서술할 수 있음",
      "후속 미팅 또는 자료 요청이 발생함",
    ],
    openQuestions: [
      "타깃 시장의 1차 지역 (한국/북미/글로벌)이 어디인가요?",
      "특정 경쟁사를 명시적으로 비교 슬라이드에 포함할까요?",
    ],
  };
}

export function mockDesign(brief: InterviewBrief, plan: DeckPlan): DesignSystem {
  return requireDesignSystemFromPlan({ brief, plan });
}

export function mockLayout(plan: DeckPlan, design: DesignSystem): LayoutPrototype {
  const artifacts = renderLocalLayoutArtifacts(createLayoutIrFromPlan({ plan, design }));
  return { ...artifacts.prototype, validationReport: validateLayoutArtifacts(artifacts) };
}

export function mockSlides(plan: DeckPlan): GeneratedSlide[] {
  return plan.slides.map((s) => ({
    number: s.number,
    version: 1,
    status: "ready",
    imageDescriptor: `${s.role}|${s.title}|${s.coreMessage}`,
    notes: undefined,
  }));
}

export function mockLayers(plan: DeckPlan, design: DesignSystem): EditableLayerModel[] {
  return plan.slides.map((s) => ({
    slideNumber: s.number,
    layers: [
      {
        id: `bg_${s.number}`,
        type: "shape",
        role: "background",
        bounds: { x: 0, y: 0, w: design.canvas.w, h: design.canvas.h },
        editable: false,
      },
      {
        id: `title_${s.number}`,
        type: "text",
        role: "title",
        text: s.title,
        bounds: { x: 96, y: 120, w: design.canvas.w - 192, h: 110 },
        editable: true,
      },
      {
        id: `msg_${s.number}`,
        type: "text",
        role: "message",
        text: s.coreMessage,
        bounds: { x: 96, y: 250, w: design.canvas.w - 192, h: 80 },
        editable: true,
      },
      {
        id: `visual_${s.number}`,
        type: "shape",
        role: "visual",
        bounds: { x: 96, y: 380, w: design.canvas.w - 192, h: design.canvas.h - 520 },
        editable: true,
      },
      {
        id: `src_${s.number}`,
        type: "text",
        role: "source",
        text: s.evidence.length ? `출처: ${s.evidence.join(", ")}` : "—",
        bounds: { x: 96, y: design.canvas.h - 100, w: design.canvas.w - 192, h: 40 },
        editable: true,
      },
    ],
  }));
}

export { hash };
