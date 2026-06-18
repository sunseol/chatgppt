import type { ReactNode } from "react";
import { SlidePreview } from "@/components/deck/SlidePreview";
import type { DesignSystem } from "@/lib/deck-types";
import { FONT_POLICY } from "@/lib/font-policy";

export const DESIGN_APPROVAL_CTA_LABEL = "디자인 시스템을 승인하고 레이아웃 초안 생성 시작";
export { DesignSystemEditorPanel } from "@/components/deck/DesignSystemEditorPanel";

export function DesignSystemSummaryPanel({ design }: { readonly design: DesignSystem }) {
  return (
    <PanelBlock label="Summary">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <SummaryItem label="Design System ID" value={design.id} mono />
        <SummaryItem
          label="Canvas"
          value={`${design.canvas.ratio} · ${design.canvas.w}x${design.canvas.h}`}
        />
        <SummaryItem
          label="Safe Margin"
          value={`${design.canvas.safeMargin.x}px / ${design.canvas.safeMargin.y}px`}
        />
        <SummaryItem
          label="Grid"
          value={`${design.grid.columns} columns · ${design.grid.gutter}px gutter`}
        />
        <SummaryItem label="Title" value={design.typography.titleStyle} />
        <SummaryItem label="Body" value={design.typography.bodyStyle} />
        <div className="col-span-2">
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Visual Language
          </dt>
          <dd className="mt-1">{design.visualLanguage}</dd>
        </div>
      </dl>
    </PanelBlock>
  );
}

export function DesignSystemColorTokensPanel({ design }: { readonly design: DesignSystem }) {
  return (
    <PanelBlock label="Color Tokens">
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
    <PanelBlock label="Typography">
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
    <PanelBlock label="Negative Rules">
      <ul className="space-y-1 text-sm">
        {design.negativeRules.map((rule) => (
          <li key={rule}>· {rule}</li>
        ))}
      </ul>
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
    <PanelBlock label="Sample preview">
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
