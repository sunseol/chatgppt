import type { LiveResearchApprovalIssue } from "./live-research-approval-gate";
import type { ResearchSourceCaptureMetadata, Source } from "./research-types";

export function sourceCaptureApprovalIssues(
  sources: readonly Source[],
): readonly LiveResearchApprovalIssue[] {
  return sources.flatMap((source): readonly LiveResearchApprovalIssue[] => {
    const capture = source.capture;
    if (capture === undefined) {
      return [
        {
          code: "source_missing_live_capture" as const,
          sourceId: source.id,
          message: `Research source ${source.id} requires live capture metadata before approval.`,
        },
      ];
    }

    const missing = captureProblems(capture);
    return missing.length === 0
      ? []
      : [
          {
            code: "source_capture_incomplete" as const,
            sourceId: source.id,
            message: `Research source ${source.id} has incomplete live capture metadata: ${missing.join(", ")}`,
          },
        ];
  });
}

function captureProblems(capture: ResearchSourceCaptureMetadata): readonly string[] {
  return [
    ...(isHttpUrl(capture.originalUrl) ? [] : ["originalUrl"]),
    ...(isHttpUrl(capture.finalUrl) ? [] : ["finalUrl"]),
    ...(Number.isFinite(capture.fetchedAt) && capture.fetchedAt > 0 ? [] : ["fetchedAt"]),
    ...(capture.mimeType.trim() ? [] : ["mimeType"]),
    ...(Number.isInteger(capture.statusCode) &&
    capture.statusCode >= 200 &&
    capture.statusCode < 400
      ? []
      : ["statusCode"]),
    ...(isShaLabel(capture.contentHash) ? [] : ["contentHash"]),
    ...(capture.rawArchivePath.trim() ? [] : ["rawArchivePath"]),
    ...(capture.textArchivePath.trim() ? [] : ["textArchivePath"]),
    ...(isShaLabel(capture.extractedTextHash) ? [] : ["extractedTextHash"]),
    ...(Number.isInteger(capture.version) && capture.version > 0 ? [] : ["version"]),
  ];
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isShaLabel(value: string): boolean {
  return value.startsWith("sha256:") && value.length > "sha256:".length;
}
