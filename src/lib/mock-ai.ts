import type {
  InterviewBrief, ResearchPack, DeckPlan, DesignSystem,
  LayoutPrototype, GeneratedSlide, EditableLayerModel, SlideSpec,
} from "./deck-types";

const hash = (s: string) =>
  "sha256:" + Math.abs([...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))
    .toString(16).padStart(8, "0");

export function mockBrief(prompt: string, slideCount: number, ratio: "16:9" | "4:3"): InterviewBrief {
  return {
    id: "brief_" + Date.now().toString(36),
    goal: prompt.length > 60 ? prompt.slice(0, 60) + "…" : prompt,
    audience: "초기 단계 VC 및 산업 전문가",
    desiredOutcome: "5분 안에 문제의 크기와 솔루션의 차별성을 이해시키고 후속 미팅 요청을 이끌어낸다.",
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

export function mockResearch(brief: InterviewBrief): ResearchPack {
  const sources = [
    { id: "src_001", title: "한국 디지털 콘텐츠 산업 백서 2025", publisher: "한국콘텐츠진흥원", year: 2025, grade: "A" as const },
    { id: "src_002", title: "Global AI Market Outlook 2026", publisher: "Gartner", year: 2026, grade: "B" as const },
    { id: "src_003", title: "엔터프라이즈 SaaS 도입 현황 조사", publisher: "IDC Korea", year: 2025, grade: "A" as const },
    { id: "src_004", title: "생성형 AI 사용자 조사", publisher: "Statista", year: 2026, grade: "B" as const },
  ];
  const claims = [
    { id: "claim_001", statement: "국내 기업의 67%가 AI 도구를 업무에 시범 도입 중이다.", sourceIds: ["src_003"], confidence: "high" as const, slideCandidates: [2, 3] },
    { id: "claim_002", statement: "AI 기반 콘텐츠 제작 시장은 연평균 38% 성장하고 있다.", sourceIds: ["src_001", "src_002"], confidence: "high" as const, slideCandidates: [3] },
    { id: "claim_003", statement: "생성된 결과물의 검증 부재가 도입의 주요 장벽이다.", sourceIds: ["src_004"], confidence: "medium" as const, slideCandidates: [2, 4] },
    { id: "claim_004", statement: "이 기능은 시장에서 강한 차별성을 가진다.", sourceIds: [], confidence: "assumption" as const, slideCandidates: [5] },
  ];
  return { id: "res_" + Date.now().toString(36), sources, claims };
}

export function mockPlan(brief: InterviewBrief, _research: ResearchPack): DeckPlan {
  const baseSpecs: Omit<SlideSpec, "number">[] = [
    { title: "검증 가능한 AI 슬라이드 제작 시스템", role: "Title", coreMessage: "단순 생성형 PPT가 아니라 승인·조사·편집성을 갖춘 제작 시스템", visualType: "Hero + 강한 타이포그래피", evidence: [], editableElements: ["제목", "부제", "날짜"] },
    { title: "AI PPT 생성의 4가지 실패 지점", role: "Problem", coreMessage: "의도 오해, 조사 부재, 디자인 불일치, 편집 불가능성", visualType: "2x2 카드", evidence: ["claim_003"], editableElements: ["카드 제목", "카드 본문"] },
    { title: "시장 변화가 만드는 기회", role: "Market", coreMessage: "AI 콘텐츠 제작 시장은 빠르게 확장 중", visualType: "막대 차트 + 인사이트 카드", evidence: ["claim_001", "claim_002"], editableElements: ["수치", "인사이트", "캡션"] },
    { title: "강제 워크플로우 솔루션", role: "Solution", coreMessage: "11단계 승인 게이트로 생성 품질을 보장", visualType: "워크플로우 다이어그램", evidence: [], editableElements: ["단계명", "단계 설명"] },
    { title: "경쟁 대비 차별점", role: "Differentiator", coreMessage: "기존 도구는 생성에 집중, 우리는 검증·편집성에 집중", visualType: "비교 표", evidence: ["claim_004"], editableElements: ["행", "체크 아이콘"] },
    { title: "비즈니스 모델", role: "Business", coreMessage: "구독형 SaaS + 엔터프라이즈 라이선스", visualType: "가격 카드 3종", evidence: [], editableElements: ["가격", "플랜 설명"] },
    { title: "로드맵", role: "Roadmap", coreMessage: "MVP → 협업 → 클라우드 확장", visualType: "타임라인", evidence: [], editableElements: ["분기 라벨", "마일스톤"] },
    { title: "함께 만들어 갑시다", role: "Closing", coreMessage: "신뢰 기반 AI 제작 도구의 다음 단계를 함께", visualType: "클로징 + CTA", evidence: [], editableElements: ["CTA 문구", "연락처"] },
  ];
  const specs = baseSpecs.slice(0, brief.slideCount).map((s, i) => ({ ...s, number: i + 1 }));
  while (specs.length < brief.slideCount) {
    specs.push({ ...baseSpecs[specs.length % baseSpecs.length], number: specs.length + 1 });
  }
  const md = [
    `# Deck Plan`, ``,
    `**목적:** ${brief.goal}`,
    `**청중:** ${brief.audience}`,
    `**화면 비율:** ${brief.aspectRatio} · **언어:** ${brief.language} · **총 ${specs.length}장**`,
    `**핵심 메시지:** AI PPT 제작의 병목은 생성이 아니라 검증과 편집성이다.`, ``,
    ...specs.flatMap((s) => [
      `## Slide ${s.number}. ${s.title}`,
      `- 역할: ${s.role}`,
      `- 핵심 메시지: ${s.coreMessage}`,
      `- 시각화 방향: ${s.visualType}`,
      `- 사용할 근거: ${s.evidence.length ? s.evidence.join(", ") : "없음"}`,
      `- 편집 가능 요소: ${s.editableElements.join(", ")}`,
      ``,
    ]),
  ].join("\n");
  return { id: "plan_" + Date.now().toString(36), markdown: md, slides: specs };
}

export function mockDesign(brief: InterviewBrief): DesignSystem {
  const ratio = brief.aspectRatio;
  const dim = ratio === "16:9" ? { w: 1920, h: 1080 } : { w: 1440, h: 1080 };
  return {
    id: "ds_" + Date.now().toString(36),
    canvas: { ratio, ...dim },
    colors: { background: "#F7F4EF", textPrimary: "#1A1B26", primary: "#1F3A5F", accent: "#D89A3F" },
    typography: { titleStyle: "Bold geometric serif, 56–84pt", bodyStyle: "Clean sans, 28–38pt" },
    visualLanguage: "Editorial consulting · 절제된 미니멀 · 따뜻한 페이퍼 톤",
    negativeRules: [
      "임의 그라데이션 금지",
      "장식적 일러스트 금지",
      "제목 위치 슬라이드 간 변경 금지",
      "출처 없는 수치 시각화 금지",
    ],
  };
}

const COMPONENT_TYPES = [
  "CoverHero", "KeyMessage", "ChartWithInsight", "MetricCards",
  "ComparisonTable", "Timeline", "TwoColumn", "ClosingSummary",
];

export function mockLayout(plan: DeckPlan, _design: DesignSystem): LayoutPrototype {
  const slides = plan.slides.map((s, i) => {
    const componentType = i === 0 ? "CoverHero"
      : i === plan.slides.length - 1 ? "ClosingSummary"
      : COMPONENT_TYPES[i % COMPONENT_TYPES.length];
    return {
      number: s.number,
      componentType,
      html: `<section data-slide-id="slide_${s.number}" data-layout="${componentType}"><h1 data-layer="title">${s.title}</h1><p data-layer="message">${s.coreMessage}</p></section>`,
      domLayers: [
        { id: `slide_${s.number}_title`, role: "title", editable: true },
        { id: `slide_${s.number}_message`, role: "subtitle", editable: true },
        { id: `slide_${s.number}_visual`, role: s.visualType.split(" ")[0].toLowerCase(), editable: true },
        { id: `slide_${s.number}_source`, role: "source", editable: true },
      ],
    };
  });
  return { id: "layout_" + Date.now().toString(36), slides };
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
      { id: `bg_${s.number}`, type: "shape", role: "background", bounds: { x: 0, y: 0, w: design.canvas.w, h: design.canvas.h }, editable: false },
      { id: `title_${s.number}`, type: "text", role: "title", text: s.title, bounds: { x: 96, y: 120, w: design.canvas.w - 192, h: 110 }, editable: true },
      { id: `msg_${s.number}`, type: "text", role: "message", text: s.coreMessage, bounds: { x: 96, y: 250, w: design.canvas.w - 192, h: 80 }, editable: true },
      { id: `visual_${s.number}`, type: "shape", role: "visual", bounds: { x: 96, y: 380, w: design.canvas.w - 192, h: design.canvas.h - 520 }, editable: true },
      { id: `src_${s.number}`, type: "text", role: "source", text: s.evidence.length ? `출처: ${s.evidence.join(", ")}` : "—", bounds: { x: 96, y: design.canvas.h - 100, w: design.canvas.w - 192, h: 40 }, editable: true },
    ],
  }));
}

export { hash };
