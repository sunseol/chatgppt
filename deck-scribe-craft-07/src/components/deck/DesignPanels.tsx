import type { ReactNode } from "react";
import { SlidePreview } from "@/components/deck/SlidePreview";
import type { DesignSystem } from "@/lib/deck-types";
import { FONT_POLICY } from "@/lib/font-policy";

export const DESIGN_APPROVAL_CTA_LABEL = "디자인 시스템을 승인하고 레이아웃 초안 생성 시작";
export { DesignSystemEditorPanel } from "@/components/deck/DesignSystemEditorPanel";

export function DesignSystemSummaryPanel({ design }: { readonly design: DesignSystem }) {
  return (
    <PanelBlock label="요약">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <SummaryItem label="디자인 ID" value={design.id} mono />
        <SummaryItem
          label="캔버스"
          value={`${design.canvas.ratio} · ${design.canvas.w}x${design.canvas.h}`}
        />
        <SummaryItem
          label="안전 여백"
          value={`${design.canvas.safeMargin.x}px / ${design.canvas.safeMargin.y}px`}
        />
        <SummaryItem
          label="그리드"
          value={`${design.grid.columns} columns · ${design.grid.gutter}px gutter`}
        />
        <SummaryItem label="제목" value={design.typography.titleStyle} />
        <SummaryItem label="본문" value={design.typography.bodyStyle} />
        <div className="col-span-2">
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">시각 톤</dt>
          <dd className="mt-1">{design.visualLanguage}</dd>
        </div>
      </dl>
    </PanelBlock>
  );
}

export function DesignSystemColorTokensPanel({ design }: { readonly design: DesignSystem }) {
  return (
    <PanelBlock label="색상">
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(design.colors).map(([key, value]) => (
          <div key={key} className="border border-border bg-background p-2">
            <div className="h-10 border border-border" style={{ background: value }} />
            <div className="mt-2 truncate text-[11px] text-muted-foreground">{key}</div>
            <div className="font-mono text-[11px]">{value}</div>
          </div>
        ))}
      </div>
    </PanelBlock>
  );
}

export function DesignSystemTypographyPanel({ design }: { readonly design: DesignSystem }) {
  return (
    <PanelBlock label="글꼴">
      <div className="space-y-4">
        <TypeSample
          label="H1 제목"
          value={design.typography.titleStyle}
          family={FONT_POLICY.serifFamily}
          className="text-3xl font-semibold"
        />
        <TypeSample
          label="H2 섹션 제목"
          value={design.typography.title.style}
          family={FONT_POLICY.serifFamily}
          className="text-xl font-semibold"
        />
        <TypeSample
          label="본문"
          value={design.typography.bodyStyle}
          family={FONT_POLICY.sansFamily}
          className="text-base"
        />
      </div>
    </PanelBlock>
  );
}

export function DesignSystemNegativeRulesPanel({ design }: { readonly design: DesignSystem }) {
  return (
    <PanelBlock label="피해야 할 표현">
      <ul className="space-y-1 text-sm">
        {design.negativeRules.map((rule) => (
          <li key={rule}>· {rule}</li>
        ))}
      </ul>
    </PanelBlock>
  );
}

export function DesignSystemComponentPreviewPanel({ design }: { readonly design: DesignSystem }) {
  const colors = design.colors;
  return (
    <PanelBlock label="컴포넌트 규칙">
      <div className="grid gap-3 sm:grid-cols-[1fr_1.15fr]">
        <div
          className="border p-4"
          style={{
            background: colors.background,
            borderColor: colors.secondary,
            color: colors.textPrimary,
          }}
        >
          <div
            className="inline-flex h-8 items-center px-3 text-xs font-medium"
            style={{ background: colors.textPrimary, color: colors.background }}
          >
            주요 버튼
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["근거", "차트", "편집"].map((item, index) => (
              <span
                key={item}
                className="border px-2 py-1 text-[11px]"
                style={{
                  borderColor: index === 0 ? colors.accent : colors.secondary,
                  color: colors.textSecondary,
                }}
              >
                {item}
              </span>
            ))}
          </div>
          <div
            className="mt-5 flex h-16 items-end gap-2 border-l border-b pl-3"
            style={{ borderColor: colors.secondary }}
          >
            {[0.42, 0.72, 0.58, 0.9].map((height, index) => (
              <div
                key={index}
                className="w-6"
                style={{
                  height: `${height * 100}%`,
                  background: index === 3 ? colors.accent : colors.primary,
                }}
              />
            ))}
          </div>
        </div>
        <ul className="space-y-2 text-sm">
          {design.componentRules.map((rule) => (
            <li key={rule} className="border border-border bg-background px-3 py-2">
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </PanelBlock>
  );
}

export function DesignSystemJsonPanel({ design }: { readonly design: DesignSystem }) {
  return (
    <PanelBlock label="JSON">
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
        {JSON.stringify(design, null, 2)}
      </pre>
    </PanelBlock>
  );
}

export function DesignSystemPreviewPanel({
  design,
  previewTitle,
}: {
  readonly design: DesignSystem;
  readonly previewTitle: string;
}) {
  return (
    <PanelBlock label="샘플 슬라이드">
      <div className="aspect-video w-full overflow-hidden border border-border bg-background">
        <SlidePreview
          design={design}
          spec={{
            number: 1,
            title: previewTitle,
            role: "Cover",
            coreMessage: "디자인 시스템이 적용된 미리보기",
            visualType: "Cover",
            evidence: [],
            editableElements: [],
          }}
          slide={{ number: 1, version: 1, status: "ready", imageDescriptor: "" }}
          mode="image"
        />
      </div>
    </PanelBlock>
  );
}

function PanelBlock({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="border border-border bg-paper p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function TypeSample({
  label,
  value,
  family,
  className,
}: {
  readonly label: string;
  readonly value: string;
  readonly family: string;
  readonly className: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words ${className}`} style={{ fontFamily: family }}>
        {value}
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  mono,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`mt-1 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
