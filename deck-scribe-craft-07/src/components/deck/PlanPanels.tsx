import { AlertTriangle, ClipboardCheck, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SlideSpec } from "@/lib/deck-types";
import type { SlideSpecParseResult } from "@/lib/slide-spec-parser";

export function PlanValidationSummary({ result }: { readonly result: SlideSpecParseResult }) {
  if (result.valid) {
    return (
      <section className="border border-success/30 bg-success/10 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium text-success">
          <ClipboardCheck className="h-4 w-4" />
          승인 가능
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {result.specs.length}개 슬라이드 구조를 읽었습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-destructive/30 bg-destructive/10 p-4 text-sm">
      <div className="flex items-center gap-2 font-medium text-destructive">
        <AlertTriangle className="h-4 w-4" />
        수정하면 승인할 수 있음
      </div>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {result.issues.map((issue, index) => (
          <li key={`${issue.code}_${issue.slideNumber ?? "deck"}_${index}`}>{issue.message}</li>
        ))}
      </ul>
    </section>
  );
}

export function PlanSlideSpecPreview({ specs }: { readonly specs: readonly SlideSpec[] }) {
  return (
    <section className="border border-border bg-paper">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-accent" />
          파싱된 슬라이드
        </div>
        <span className="font-mono text-xs text-muted-foreground">{specs.length}개</span>
      </div>
      {specs.length === 0 ? (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          검증 오류를 해결하면 슬라이드 구조가 표시됩니다.
        </div>
      ) : (
        <ul className="grid gap-4 p-4 md:grid-cols-2">
          {specs.map((spec) => (
            <li key={spec.number} className="border border-border bg-background text-sm">
              <PlanSpecCanvas spec={spec} />
              <div className="min-w-0 border-t border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    #{String(spec.number).padStart(2, "0")}
                  </span>
                  <h3 className="font-medium">{spec.title}</h3>
                  <Badge variant="outline">{spec.role}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{spec.coreMessage}</p>
                <PlanSpecMeta spec={spec} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PlanSpecCanvas({ spec }: { readonly spec: SlideSpec }) {
  const evidence = spec.evidence.slice(0, 3);
  return (
    <div className="aspect-video overflow-hidden bg-paper p-4">
      <div className="flex h-full flex-col justify-between border border-border bg-background p-4">
        <div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{spec.role}</span>
            <span>{spec.visualType}</span>
          </div>
          <div className="mt-3 h-1 w-10 bg-accent" />
          <div className="mt-3 line-clamp-2 font-serif text-lg font-semibold leading-tight">
            {spec.title}
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 w-full bg-secondary" />
            <div className="h-1.5 w-4/5 bg-secondary" />
          </div>
        </div>
        <SpecVisualBlock role={spec.role} visualType={spec.visualType} />
        <div className="flex gap-1 overflow-hidden">
          {(evidence.length ? evidence : ["근거 없음"]).map((item) => (
            <span
              key={item}
              className="max-w-[33%] truncate border border-border bg-paper px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpecVisualBlock({
  role,
  visualType,
}: {
  readonly role: string;
  readonly visualType: string;
}) {
  if (/chart|market|data|bar/i.test(`${role} ${visualType}`)) {
    return (
      <div className="mt-3 flex h-16 items-end gap-2 border-l border-b border-border pl-3">
        {[0.38, 0.64, 0.5, 0.86].map((height, index) => (
          <div
            key={index}
            className={index === 3 ? "w-6 bg-accent" : "w-6 bg-foreground/25"}
            style={{ height: `${height * 100}%` }}
          />
        ))}
      </div>
    );
  }
  if (/roadmap|timeline|process/i.test(`${role} ${visualType}`)) {
    return (
      <div className="mt-3 flex h-16 items-center justify-between">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex flex-1 items-center">
            <div className={index === 1 ? "h-4 w-4 bg-accent" : "h-4 w-4 bg-foreground/25"} />
            {index < 3 ? <div className="h-px flex-1 bg-border" /> : null}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-3 grid h-16 grid-cols-2 gap-2">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="border border-border bg-paper">
          <div className={index === 0 ? "h-full w-1.5 bg-accent" : "h-full w-1.5 bg-secondary"} />
        </div>
      ))}
    </div>
  );
}

export function PlanRevisionRequest({
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
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">수정 요청</div>
      <Textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder="예: 시장 근거 슬라이드의 수치 표현을 더 보수적으로"
        className="mt-2 text-sm"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || !value.trim()}
        onClick={onApply}
        className="mt-3 w-full"
      >
        요청을 마크다운에 반영
      </Button>
    </section>
  );
}

function PlanSpecMeta({ spec }: { readonly spec: SlideSpec }) {
  return (
    <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
      <Meta label="시각화" value={spec.visualComposition ?? spec.visualType} />
      <Meta label="사용할 자료" value={spec.evidence.length ? spec.evidence.join(", ") : "없음"} />
      <Meta label="본문" value={(spec.bodyPoints ?? []).join(", ")} />
      <Meta label="편집 요소" value={spec.editableElements.join(", ")} />
      <Meta label="자료 사용 조건" value={(spec.dataSourceConstraints ?? []).join(", ")} wide />
    </dl>
  );
}

function Meta({
  label,
  value,
  wide,
}: {
  readonly label: string;
  readonly value: string;
  readonly wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value || "없음"}</dd>
    </div>
  );
}
