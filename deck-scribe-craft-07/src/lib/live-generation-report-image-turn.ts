import type { LiveSlideReportLineage } from "./live-generation-report-lineage";

export function liveReportImageTurnId(slide: LiveSlideReportLineage): string | undefined {
  return slide.imageTurnId ?? slide.imageRequestId;
}

export function liveReportImageIdentityLabel(slide: LiveSlideReportLineage): string {
  return slide.imageProviderKind === "codex" ? "image turn" : "image request";
}
