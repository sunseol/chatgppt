export type InterviewQuestionField =
  | "goal"
  | "audience"
  | "desiredOutcome"
  | "coreMessage"
  | "slideCount"
  | "aspectRatio"
  | "language"
  | "tone"
  | "mustInclude"
  | "mustAvoid"
  | "successCriteria";

export interface InterviewQuestionInput {
  readonly initialPrompt: string;
  readonly slideCount: number;
  readonly aspectRatio: "16:9" | "4:3";
  readonly language: "ko" | "en" | "mixed";
}

export interface InterviewQuestion {
  readonly field: InterviewQuestionField;
  readonly question: string;
}

export interface InterviewDraft {
  readonly goal?: string;
  readonly audience?: string;
  readonly desiredOutcome?: string;
  readonly coreMessage?: string;
  readonly slideCount: number;
  readonly aspectRatio: "16:9" | "4:3";
  readonly language: "ko" | "en" | "mixed";
  readonly tone: readonly string[];
  readonly mustInclude: readonly string[];
  readonly mustAvoid: readonly string[];
  readonly successCriteria: readonly string[];
}

export interface InterviewQuestionPlan {
  readonly draft: InterviewDraft;
  readonly questions: readonly InterviewQuestion[];
  readonly openQuestions: readonly string[];
}

interface MatchRule {
  readonly needle: string;
  readonly value: string;
}

const INCLUDE_RULES: readonly MatchRule[] = [
  { needle: "문제 정의", value: "문제 정의" },
  { needle: "시장", value: "시장" },
  { needle: "솔루션", value: "솔루션" },
  { needle: "비즈니스 모델", value: "비즈니스 모델" },
  { needle: "채널별 성과", value: "채널별 성과" },
  { needle: "핵심 캠페인", value: "핵심 캠페인" },
  { needle: "학습", value: "학습" },
  { needle: "다음 분기 계획", value: "다음 분기 계획" },
  { needle: "고객사 로고", value: "고객사 로고" },
  { needle: "사례", value: "사례" },
];

const AVOID_RULES: readonly MatchRule[] = [
  { needle: "과장된 수치", value: "과장된 수치" },
  { needle: "출처 없는 그래프", value: "출처 없는 그래프" },
  { needle: "출처 없는 시장 규모", value: "출처 없는 시장 규모" },
];

const TONE_RULES: readonly MatchRule[] = [
  { needle: "데이터 기반", value: "데이터 기반" },
  { needle: "절제된", value: "절제된" },
  { needle: "전문", value: "전문적" },
  { needle: "미래지향", value: "미래지향적" },
  { needle: "미니멀", value: "미니멀" },
  { needle: "고급", value: "고급" },
];

export function planInterviewQuestions(input: InterviewQuestionInput): InterviewQuestionPlan {
  const prompt = input.initialPrompt;
  const goal = extractGoal(prompt);
  const audience = extractAudience(prompt);
  const desiredOutcome = extractDesiredOutcome(prompt);
  const languageConflict = hasLanguageConflict(prompt);
  const draft: InterviewDraft = {
    ...(goal === undefined ? {} : { goal }),
    ...(audience === undefined ? {} : { audience }),
    ...(desiredOutcome === undefined ? {} : { desiredOutcome }),
    slideCount: input.slideCount,
    aspectRatio: input.aspectRatio,
    language: languageConflict ? "mixed" : input.language,
    tone: collectMatches(prompt, TONE_RULES),
    mustInclude: collectMatches(prompt, INCLUDE_RULES),
    mustAvoid: collectMatches(prompt, AVOID_RULES),
    successCriteria: extractSuccessCriteria(prompt),
  };

  return {
    draft,
    questions: createQuestions(draft),
    openQuestions: languageConflict ? ["한국어와 English only 지시가 충돌합니다."] : [],
  };
}

function extractGoal(prompt: string): string | undefined {
  if (containsAny(prompt, ["투자", "피치덱", "VC"])) return "투자 유치용 피치덱";
  if (containsAny(prompt, ["내부 보고", "성과 보고"])) return "내부 보고용 덱";
  if (containsAny(prompt, ["강의", "교육"])) return "교육 자료";
  if (containsAny(prompt, ["제안서"])) return "제안서";
  return undefined;
}

function extractAudience(prompt: string): string | undefined {
  if (containsAny(prompt, ["VC", "투자자"])) return "초기 VC 및 투자자";
  if (containsAny(prompt, ["임원"])) return "임원";
  if (containsAny(prompt, ["고객"])) return "고객";
  if (containsAny(prompt, ["학생", "중학생"])) return "학생";
  if (containsAny(prompt, ["대중"])) return "대중";
  return undefined;
}

function extractDesiredOutcome(prompt: string): string | undefined {
  if (containsAny(prompt, ["승인", "의사결정"])) return "승인 또는 의사결정";
  if (containsAny(prompt, ["후속 미팅"])) return "후속 미팅";
  if (containsAny(prompt, ["구매"])) return "구매 전환";
  if (containsAny(prompt, ["학습", "이해"])) return "이해 또는 학습";
  return undefined;
}

function extractSuccessCriteria(prompt: string): readonly string[] {
  if (containsAny(prompt, ["후속 미팅"])) return ["후속 미팅 요청"];
  if (containsAny(prompt, ["승인받고", "승인"])) return ["승인 가능한 명확성"];
  return [];
}

function createQuestions(draft: InterviewDraft): readonly InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];
  if (draft.goal === undefined) questions.push(createInterviewQuestion("goal"));
  if (draft.audience === undefined) questions.push(createInterviewQuestion("audience"));
  if (draft.desiredOutcome === undefined) questions.push(createInterviewQuestion("desiredOutcome"));
  if (draft.coreMessage === undefined) questions.push(createInterviewQuestion("coreMessage"));
  if (draft.tone.length === 0) questions.push(createInterviewQuestion("tone"));
  if (draft.mustInclude.length === 0) questions.push(createInterviewQuestion("mustInclude"));
  if (draft.mustAvoid.length === 0) questions.push(createInterviewQuestion("mustAvoid"));
  if (draft.successCriteria.length === 0)
    questions.push(createInterviewQuestion("successCriteria"));
  return questions;
}

export function createInterviewQuestion(field: InterviewQuestionField): InterviewQuestion {
  return {
    field,
    question: QUESTION_TEXT[field],
  };
}

const QUESTION_TEXT: Record<InterviewQuestionField, string> = {
  goal: "이 덱의 목적은 무엇인가요?",
  audience: "주요 청중은 누구인가요?",
  desiredOutcome: "청중이 보고 난 뒤 어떤 행동이나 판단을 하길 원하나요?",
  coreMessage: "덱 전체를 관통하는 핵심 메시지는 무엇인가요?",
  slideCount: "원하는 슬라이드 수는 몇 장인가요?",
  aspectRatio: "원하는 화면 비율은 16:9인가요, 4:3인가요?",
  language: "최종 산출물의 언어는 무엇인가요?",
  tone: "원하는 톤앤매너는 무엇인가요?",
  mustInclude: "반드시 포함해야 할 요소는 무엇인가요?",
  mustAvoid: "반드시 피해야 할 표현이나 스타일은 무엇인가요?",
  successCriteria: "완성 결과를 평가할 성공 기준은 무엇인가요?",
};

function collectMatches(prompt: string, rules: readonly MatchRule[]): readonly string[] {
  const matches: string[] = [];
  for (const rule of rules) {
    if (includesText(prompt, rule.needle) && !matches.includes(rule.value)) {
      matches.push(rule.value);
    }
  }
  return matches;
}

function containsAny(prompt: string, needles: readonly string[]): boolean {
  return needles.some((needle) => includesText(prompt, needle));
}

function includesText(prompt: string, needle: string): boolean {
  return prompt.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

function hasLanguageConflict(prompt: string): boolean {
  return includesText(prompt, "한국어") && includesText(prompt, "english only");
}
