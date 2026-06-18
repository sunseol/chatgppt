import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GateBar } from "@/components/deck/GateBar";
import {
  DESIGN_APPROVAL_CTA_LABEL,
  DesignSystemEditorPanel,
  DesignSystemJsonPanel,
  DesignSystemPreviewPanel,
  DesignSystemSummaryPanel,
} from "@/components/deck/DesignPanels";
import type { DesignSystem } from "@/lib/deck-types";

describe("minimal design approval UI", () => {
  test("renders summary, JSON, preview, design id, and exact approval CTA", () => {
    const design = validDesignSystem();

    const markup = renderToStaticMarkup(
      <>
        <DesignSystemSummaryPanel design={design} />
        <DesignSystemJsonPanel design={design} />
        <DesignSystemPreviewPanel design={design} previewTitle="투자자 피치덱" />
        <GateBar
          approve={{
            label: DESIGN_APPROVAL_CTA_LABEL,
            onClick: () => undefined,
          }}
        />
      </>,
    );

    expect(markup.includes("디자인 ID")).toBe(true);
    expect(markup.includes("ds_001")).toBe(true);
    expect(markup.includes("JSON")).toBe(true);
    expect(markup.includes("do not invent chart values")).toBe(true);
    expect(markup.includes("디자인 시스템이 적용된 미리보기")).toBe(true);
    expect(markup.includes("디자인 시스템을 승인하고 레이아웃 초안 생성 시작")).toBe(true);
  });

  test("renders token editor controls and save action", () => {
    const design = validDesignSystem();

    const markup = renderToStaticMarkup(
      <>
        <DesignSystemEditorPanel
          design={design}
          dirty
          disabled={false}
          onChange={() => undefined}
          onSave={() => undefined}
        />
        <GateBar
          approve={{
            label: DESIGN_APPROVAL_CTA_LABEL,
            onClick: () => undefined,
          }}
        />
      </>,
    );

    expect(markup.includes("디자인 조정")).toBe(true);
    expect(markup.includes("background")).toBe(true);
    expect(markup.includes("#F7F4EF")).toBe(true);
    expect(markup.includes("글꼴 크기")).toBe(true);
    expect(markup.includes("피해야 할 표현")).toBe(true);
    expect(markup.includes("do not invent chart values")).toBe(true);
    expect(markup.includes("디자인 수정 저장")).toBe(true);
    expect(markup.includes("디자인 시스템을 승인하고 레이아웃 초안 생성 시작")).toBe(true);
  });
});

function validDesignSystem(): DesignSystem {
  return {
    id: "ds_001",
    canvas: {
      ratio: "16:9",
      w: 1920,
      h: 1080,
      safeMargin: { x: 96, y: 72 },
    },
    grid: { columns: 12, gutter: 24 },
    colors: {
      background: "#F7F4EF",
      textPrimary: "#111111",
      textSecondary: "#555555",
      primary: "#1F4E79",
      secondary: "#8AA4BF",
      accent: "#FFB000",
    },
    typography: {
      titleStyle: "bold geometric sans",
      bodyStyle: "clean sans",
      title: { style: "bold geometric sans", minPx: 56, maxPx: 84 },
      body: { style: "clean sans", minPx: 28, maxPx: 38 },
      caption: { style: "clean sans", minPx: 18, maxPx: 24 },
      number: { style: "tabular sans", minPx: 40, maxPx: 72 },
    },
    layoutRules: ["title top-left"],
    componentRules: ["charts use approved datasets only"],
    visualLanguage: "Editorial consulting",
    negativeRules: [
      "do not invent chart values",
      "do not use tiny unreadable text",
      "do not use random gradients",
    ],
  };
}
