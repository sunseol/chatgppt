import { Send } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { InterviewQuestionField } from "@/lib/interview-questions";
import type { LiveInterviewAnswerMap } from "@/lib/live-interview-cutover";

export type ProductionLiveInterviewAnswersProps = {
  readonly questions: readonly string[];
  readonly requiredFields: readonly InterviewQuestionField[];
  readonly answers: LiveInterviewAnswerMap;
  readonly onAnswers: (answers: LiveInterviewAnswerMap) => void;
  readonly onSubmitAnswers?: () => void;
};

export function ProductionLiveInterviewAnswers({
  questions,
  requiredFields,
  answers,
  onAnswers,
  onSubmitAnswers,
}: ProductionLiveInterviewAnswersProps) {
  if (requiredFields.length === 0 && questions.length === 0) return null;

  const setAnswer = (field: InterviewQuestionField, value: string) => {
    onAnswers({ ...answers, [field]: value });
  };
  const missingAnswerCount = requiredFields.filter((field) => !answers[field]?.trim()).length;
  const isSubmitDisabled = onSubmitAnswers === undefined || missingAnswerCount > 0;

  return (
    <section className="mt-6 border border-border bg-paper p-5 text-sm">
      <div className="font-medium">Live interview answers</div>
      <div className="mt-2 text-muted-foreground">
        답변을 입력한 뒤 아래 버튼을 누르면 Codex가 승인 가능한 brief를 생성합니다.
      </div>
      {requiredFields.length > 0 ? (
        <div className="mt-5 space-y-4">
          {requiredFields.map((field, index) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={`live-interview-${field}`}>
                {questionLabel(questions, field, index)}
              </Label>
              <Textarea
                id={`live-interview-${field}`}
                value={answers[field] ?? ""}
                onChange={(event) => setAnswer(field, event.target.value)}
                rows={3}
              />
            </div>
          ))}
        </div>
      ) : null}
      {questions.length > requiredFields.length ? (
        <ul className="mt-5 space-y-2">
          {questions.slice(requiredFields.length).map((question) => (
            <li key={question} className="border border-border bg-background p-3">
              {question}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-5 flex flex-col gap-2 border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          {missingAnswerCount > 0
            ? `필수 답변 ${missingAnswerCount}개 남음`
            : "모든 필수 답변 입력 완료"}
        </div>
        <Button type="button" onClick={onSubmitAnswers} disabled={isSubmitDisabled}>
          <Send className="h-4 w-4" />
          답변 제출하고 브리프 생성
        </Button>
      </div>
    </section>
  );
}

function questionLabel(
  questions: readonly string[],
  field: InterviewQuestionField,
  index: number,
): string {
  return questions[index] ?? FIELD_LABELS[field];
}

const FIELD_LABELS: Record<InterviewQuestionField, string> = {
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
