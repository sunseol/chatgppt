import type { LayoutPrototype } from "@/lib/deck-types";
import type { LayoutValidationReport } from "@/lib/layout-validation";

export const LAYOUT_APPROVAL_CTA_LABEL = "레이아웃 초안을 승인하고 슬라이드 생성 시작";

type LayoutApprovalReport = LayoutValidationReport | LayoutPrototype["validationReport"];

export function canApproveLayout(report: LayoutApprovalReport | undefined): boolean {
  return report?.status === "passed";
}

export function layoutThumbnailSource(
  slide: LayoutPrototype["slides"][number],
): string | undefined {
  return slide.layoutPngDataUrl?.startsWith("data:image/png;base64,")
    ? slide.layoutPngDataUrl
    : undefined;
}

export function formatLayoutMetric(value: number): string {
  return `${Math.round(value * 100)}%`;
}
