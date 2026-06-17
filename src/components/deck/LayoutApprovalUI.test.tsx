import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  canApproveLayout,
  layoutThumbnailSource,
  LAYOUT_APPROVAL_CTA_LABEL,
} from "./layout-approval-model";
import { LayoutValidationPanel } from "./LayoutValidationPanel";
import { createLayoutIrFromPlan } from "@/lib/layout-ir";
import { renderLocalLayoutArtifacts } from "@/lib/layout-html-renderer";
import { validateLayoutArtifacts } from "@/lib/layout-validation";
import { mockBrief, mockDesign, mockPlan, mockResearch } from "@/lib/mock-ai";

describe("layout approval UI", () => {
  test("uses the exact required approval CTA copy", () => {
    expect(LAYOUT_APPROVAL_CTA_LABEL).toBe("레이아웃 초안을 승인하고 슬라이드 생성 시작");
  });

  test("allows approval only when validation passed", () => {
    const report = validReport();
    const failedReport: typeof report = { ...report, status: "failed" };

    expect(canApproveLayout(report)).toBe(true);
    expect(canApproveLayout(failedReport)).toBe(false);
    expect(canApproveLayout(undefined)).toBe(false);
  });

  test("renders validation status and key metrics", () => {
    const markup = renderToStaticMarkup(<LayoutValidationPanel report={validReport()} />);

    expect(markup.includes("검증 통과")).toBe(true);
    expect(markup.includes("렌더링")).toBe(true);
    expect(markup.includes("100%")).toBe(true);
    expect(markup.includes("Overflow")).toBe(true);
    expect(markup.includes("0%")).toBe(true);
    expect(markup.includes("Safe margin")).toBe(true);
  });

  test("uses generated PNG thumbnails when available", () => {
    const artifacts = validArtifacts();
    const slide = {
      ...artifacts.prototype.slides[0],
      layoutPngDataUrl: artifacts.slides[0]?.pngDataUrl,
    };

    expect(layoutThumbnailSource(slide)?.startsWith("data:image/png;base64,")).toBe(true);
  });
});

function validReport() {
  return validateLayoutArtifacts(validArtifacts());
}

function validArtifacts() {
  const brief = mockBrief("Layout approval UI", 8, "16:9");
  const research = mockResearch(brief);
  const plan = { ...mockPlan(brief, research), approvedHash: "sha256:approved-plan" };
  const design = { ...mockDesign(brief, plan), approvedHash: "sha256:approved-design" };
  return renderLocalLayoutArtifacts(createLayoutIrFromPlan({ plan, design }));
}
