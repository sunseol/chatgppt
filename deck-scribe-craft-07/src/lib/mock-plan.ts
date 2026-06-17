import type { DeckPlan, InterviewBrief, ResearchPack, SlideSpec } from "./deck-types";

export function mockPlan(brief: InterviewBrief, _research: ResearchPack): DeckPlan {
  const baseSpecs: Omit<SlideSpec, "number">[] = [
    {
      title: "검증 가능한 AI 슬라이드 제작 시스템",
      role: "Title",
      coreMessage: "단순 생성형 PPT가 아니라 승인·조사·편집성을 갖춘 제작 시스템",
      bodyPoints: ["승인 게이트", "출처 기반 조사", "편집 가능한 산출물"],
      visualType: "Hero + 강한 타이포그래피",
      visualComposition: "Hero + 강한 타이포그래피",
      evidence: [],
      editableElements: ["제목", "부제", "날짜"],
      dataSourceConstraints: ["구조 슬라이드라 사실 주장 없음"],
    },
    {
      title: "AI PPT 생성의 4가지 실패 지점",
      role: "Problem",
      coreMessage: "의도 오해, 조사 부재, 디자인 불일치, 편집 불가능성",
      bodyPoints: ["의도 오해", "조사 부재", "디자인 불일치", "편집 불가능성"],
      visualType: "2x2 카드",
      visualComposition: "2x2 카드",
      evidence: ["claim_003"],
      editableElements: ["카드 제목", "카드 본문"],
      dataSourceConstraints: ["claim_003"],
    },
    {
      title: "시장 변화가 만드는 기회",
      role: "Market",
      coreMessage: "AI 콘텐츠 제작 시장은 빠르게 확장 중",
      bodyPoints: ["반복 제작 수요", "생성 도구 도입 확대", "검증된 산출물 필요"],
      visualType: "막대 차트 + 인사이트 카드",
      visualComposition: "막대 차트 + 인사이트 카드",
      evidence: ["claim_001", "claim_002"],
      editableElements: ["수치", "인사이트", "캡션"],
      dataSourceConstraints: ["claim_001", "claim_002", "dataset_001"],
    },
    {
      title: "강제 워크플로우 솔루션",
      role: "Solution",
      coreMessage: "11단계 승인 게이트로 생성 품질을 보장",
      bodyPoints: ["브리프 승인", "조사 검증", "기획 승인", "편집 가능 변환"],
      visualType: "워크플로우 다이어그램",
      visualComposition: "워크플로우 다이어그램",
      evidence: [],
      editableElements: ["단계명", "단계 설명"],
      dataSourceConstraints: ["제품 워크플로우 설명"],
    },
    {
      title: "경쟁 대비 차별점",
      role: "Differentiator",
      coreMessage: "기존 도구는 생성에 집중, 우리는 검증·편집성에 집중",
      bodyPoints: ["근거 검증", "단계별 승인", "편집 가능한 레이어"],
      visualType: "비교 표",
      visualComposition: "비교 표",
      evidence: ["claim_004"],
      editableElements: ["행", "체크 아이콘"],
      dataSourceConstraints: ["claim_004"],
    },
    {
      title: "비즈니스 모델",
      role: "Business",
      coreMessage: "구독형 SaaS + 엔터프라이즈 라이선스",
      bodyPoints: ["개인/팀 구독", "엔터프라이즈 라이선스", "제작 워크플로우 관리"],
      visualType: "가격 카드 3종",
      visualComposition: "가격 카드 3종",
      evidence: [],
      editableElements: ["가격", "플랜 설명"],
      dataSourceConstraints: ["사업 가설로 표시"],
    },
    {
      title: "로드맵",
      role: "Roadmap",
      coreMessage: "MVP → 협업 → 클라우드 확장",
      bodyPoints: ["MVP 검증", "팀 협업", "클라우드 배포"],
      visualType: "타임라인",
      visualComposition: "타임라인",
      evidence: [],
      editableElements: ["분기 라벨", "마일스톤"],
      dataSourceConstraints: ["제품 계획으로 표시"],
    },
    {
      title: "함께 만들어 갑시다",
      role: "Closing",
      coreMessage: "신뢰 기반 AI 제작 도구의 다음 단계를 함께",
      bodyPoints: ["후속 미팅", "파일럿 논의", "데이터 검증 협력"],
      visualType: "클로징 + CTA",
      visualComposition: "클로징 + CTA",
      evidence: [],
      editableElements: ["CTA 문구", "연락처"],
      dataSourceConstraints: ["구조 슬라이드라 사실 주장 없음"],
    },
  ];
  const specs = baseSpecs.slice(0, brief.slideCount).map((spec, index) => ({
    ...spec,
    number: index + 1,
  }));
  while (specs.length < brief.slideCount) {
    specs.push({ ...baseSpecs[specs.length % baseSpecs.length], number: specs.length + 1 });
  }

  return {
    id: "plan_" + Date.now().toString(36),
    markdown: buildMarkdown(brief, specs),
    slides: specs,
  };
}

function buildMarkdown(brief: InterviewBrief, specs: readonly SlideSpec[]): string {
  return [
    "# Deck Plan",
    "",
    `**목적:** ${brief.goal}`,
    `**청중:** ${brief.audience}`,
    `**화면 비율:** ${brief.aspectRatio} · **언어:** ${brief.language} · **총 ${specs.length}장**`,
    "**핵심 메시지:** AI PPT 제작의 병목은 생성이 아니라 검증과 편집성이다.",
    "",
    ...specs.flatMap((spec) => [
      `## Slide ${spec.number}. ${spec.title}`,
      `- 제목: ${spec.title}`,
      `- 역할: ${spec.role}`,
      `- 핵심 메시지: ${spec.coreMessage}`,
      `- 본문 포인트: ${(spec.bodyPoints ?? []).join(", ")}`,
      `- 시각화 방향: ${spec.visualComposition ?? spec.visualType}`,
      `- 사용할 근거: ${spec.evidence.length ? spec.evidence.join(", ") : "없음"}`,
      `- 편집 가능 요소: ${spec.editableElements.join(", ")}`,
      `- 데이터/출처 제약: ${(spec.dataSourceConstraints ?? []).join(", ")}`,
      "",
    ]),
  ].join("\n");
}
