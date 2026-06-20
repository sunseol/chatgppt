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
    ...(isCanonicalHttpUrl(capture.originalUrl) ? [] : ["originalUrl"]),
    ...(isCanonicalHttpUrl(capture.finalUrl) ? [] : ["finalUrl"]),
    ...(Number.isFinite(capture.fetchedAt) && capture.fetchedAt > 0 ? [] : ["fetchedAt"]),
    ...(isCanonicalNonEmpty(capture.mimeType) ? [] : ["mimeType"]),
    ...(Number.isInteger(capture.statusCode) &&
    capture.statusCode >= 200 &&
    capture.statusCode < 400
      ? []
      : ["statusCode"]),
    ...(isCanonicalShaLabel(capture.contentHash) ? [] : ["contentHash"]),
    ...(isCanonicalNonEmpty(capture.rawArchivePath) ? [] : ["rawArchivePath"]),
    ...(isCanonicalNonEmpty(capture.textArchivePath) ? [] : ["textArchivePath"]),
    ...(isCanonicalShaLabel(capture.extractedTextHash) ? [] : ["extractedTextHash"]),
    ...(Number.isInteger(capture.version) && capture.version > 0 ? [] : ["version"]),
  ];
}

function isCanonicalHttpUrl(value: string): boolean {
  if (value !== value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isCanonicalNonEmpty(value: string): boolean {
  return value === value.trim() && value.length > 0;
}

function isCanonicalShaLabel(value: string): boolean {
  return (
    isCanonicalNonEmpty(value) && value.startsWith("sha256:") && value.length > "sha256:".length
  );
}
