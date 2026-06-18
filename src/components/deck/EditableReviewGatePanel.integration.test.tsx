import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EditableReviewGatePanel } from "@/components/deck/EditableReviewGatePanel";
import { GateBar } from "@/components/deck/GateBar";
import { evaluateEditableReviewGate } from "@/lib/editable-review-gate";

describe("editable review gate UI", () => {
  test("renders validation results failure items and disabled approval", () => {
    // Given
    const report = evaluateEditableReviewGate([
      {
        slideNumber: 2,
        layers: [
          {
            id: "bg_2",
            type: "shape",
            role: "background",
            bounds: { x: 0, y: 0, w: 1600, h: 900 },
            editable: false,
          },
        ],
      },
    ]);

    // When
    const markup = renderToStaticMarkup(
      <>
        <EditableReviewGatePanel report={report} />
        <GateBar
          hint="레이어가 준비되면 편집기에서 바로 조정할 수 있습니다."
          approve={{
            label: "편집기에서 계속 조정하기",
            onClick: () => undefined,
            disabled: !report.canApprove,
          }}
        />
      </>,
    );

    // Then
    expect(markup.includes('data-editable-review-gate="blocked"')).toBe(true);
    expect(markup.includes("편집 가능성 검증")).toBe(true);
    expect(markup.includes("레이어를 보완해야 승인할 수 있음")).toBe(true);
    expect(markup.includes("Slide 2 has no editable layers.")).toBe(true);
    expect(markup.includes("disabled")).toBe(true);
  });
});
