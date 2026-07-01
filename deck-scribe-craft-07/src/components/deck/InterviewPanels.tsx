import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InterviewBrief } from "@/lib/deck-types";
import type { InterviewQuestionPlan } from "@/lib/interview-questions";
import type { InterviewAnswerMap } from "@/components/deck/interview-stage-model";

export function QuestionAnswerPanel({
  plan,
  answers,
  onAnswers,
}: {
  readonly plan: InterviewQuestionPlan;
  readonly answers: InterviewAnswerMap;
  readonly onAnswers: (answers: InterviewAnswerMap) => void;
}) {
  return (
    <section className="border border-border bg-paper p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">인터뷰 질문</div>
      <div className="mt-4 space-y-4">
        {plan.questions.map((question) => {
          const inputId = `interview-answer-${question.field}`;
          return (
            <label key={question.field} htmlFor={inputId} className="block">
              <span className="text-sm font-medium">{question.question}</span>
              <Textarea
                id={inputId}
                aria-label={question.question}
                value={answers[question.field] ?? ""}
                onChange={(event) =>
                  onAnswers({ ...answers, [question.field]: event.target.value })
                }
                rows={2}
                placeholder="답변 입력"
                className="mt-2"
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

export function BriefEditor({
  brief,
  onBrief,
}: {
  readonly brief: InterviewBrief;
  readonly onBrief: (brief: InterviewBrief) => void;
}) {
  return (
    <section className="space-y-6">
      <EditableRow
        label="목적 (Goal)"
        value={brief.goal}
        onChange={(goal) => onBrief({ ...brief, goal })}
      />
      <EditableRow
        label="청중 (Audience)"
        value={brief.audience}
        onChange={(audience) => onBrief({ ...brief, audience })}
      />
      <EditableRow
        label="원하는 결과"
        value={brief.desiredOutcome}
        multiline
        onChange={(desiredOutcome) => onBrief({ ...brief, desiredOutcome })}
      />
      <ChipRow
        label="톤앤매너"
        values={brief.tone}
        onChange={(tone) => onBrief({ ...brief, tone })}
      />
      <ChipRow
        label="반드시 포함"
        values={brief.mustInclude}
        onChange={(mustInclude) => onBrief({ ...brief, mustInclude })}
      />
      <ChipRow
        label="금지 요소"
        values={brief.mustAvoid}
        onChange={(mustAvoid) => onBrief({ ...brief, mustAvoid })}
      />
      {brief.openQuestions.length > 0 && (
        <div className="border-l-2 border-accent bg-paper p-4">
          <div className="text-[11px] uppercase tracking-wider text-accent">사용자 확인 필요</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {brief.openQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function BriefPreview({
  brief,
  plan,
}: {
  readonly brief: InterviewBrief | undefined;
  readonly plan: InterviewQuestionPlan;
}) {
  const preview = brief ?? plan.draft;
  return (
    <section className="border border-border bg-paper p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        브리프 미리보기
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <PreviewField label="목적" value={preview.goal ?? "답변 필요"} />
        <PreviewField label="청중" value={preview.audience ?? "답변 필요"} />
        <PreviewField label="결과" value={preview.desiredOutcome ?? "답변 필요"} />
        <PreviewField label="분량" value={`${preview.slideCount}장 · ${preview.aspectRatio}`} />
        <PreviewField label="언어" value={preview.language} />
      </dl>
    </section>
  );
}

export function RevisionRequest({
  value,
  disabled,
  onChange,
  onApply,
}: {
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
  readonly onApply: () => void;
}) {
  return (
    <section className="border border-border bg-paper p-4">
      <Label
        htmlFor="interview-revision-request"
        className="text-[11px] uppercase tracking-wider text-muted-foreground"
      >
        수정 요청
      </Label>
      <Textarea
        id="interview-revision-request"
        aria-label="인터뷰 브리프 수정 요청"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        disabled={disabled}
        placeholder="예: 투자자 관점으로 더 날카롭게, 과장 표현은 줄여줘"
        className="mt-2"
      />
      <Button
        onClick={onApply}
        disabled={disabled || !value.trim()}
        variant="outline"
        className="mt-3 w-full"
      >
        수정 요청 반영
      </Button>
    </section>
  );
}

function EditableRow({
  label,
  value,
  onChange,
  multiline,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly multiline?: boolean;
}) {
  return (
    <div className="border-b border-border pb-4">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={2}
          className="mt-2 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
        />
      ) : (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
        />
      )}
    </div>
  );
}

function ChipRow({
  label,
  values,
  onChange,
}: {
  readonly label: string;
  readonly values: readonly string[];
  readonly onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="border-b border-border pb-4">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {values.map((value, index) => (
          <Badge
            key={value}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => onChange(values.filter((_value, itemIndex) => itemIndex !== index))}
          >
            {value}
            <X className="ml-1 h-3 w-3" aria-hidden="true" />
          </Badge>
        ))}
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && draft.trim()) {
              event.preventDefault();
              onChange([...values, draft.trim()]);
              setDraft("");
            }
          }}
          placeholder="+ 추가하고 Enter"
          className="h-8 w-48 border-dashed text-sm"
        />
      </div>
    </div>
  );
}

function PreviewField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
