import type { ResearchFetchKind } from "./research-source-fetcher";
import type { ResearchSourceType } from "./research-types";
import { hashContent } from "./artifacts";

export type ResearchCaptureFailureKind = "network" | "paywall" | "permission";

export type ResearchCaptureFailure = {
  readonly kind: ResearchCaptureFailureKind;
  readonly retryable: boolean;
  readonly needsUserAction: boolean;
};

export type ResearchCaptureFailureInput = {
  readonly statusCode?: number;
  readonly message: string;
};

export type ResearchSourceCaptureInput = {
  readonly id: string;
  readonly kind: ResearchFetchKind;
  readonly sourceType: ResearchSourceType;
  readonly originalUrl: string;
  readonly finalUrl: string;
  readonly fetchedAt: number;
  readonly mimeType: string;
  readonly statusCode: number;
  readonly rawContent: string;
  readonly extractedText: string;
  readonly rawArchivePath: string;
  readonly textArchivePath: string;
};

export type ResearchSourceCapture = ResearchSourceCaptureInput & {
  readonly status: "succeeded";
  readonly version: 1;
  readonly contentHash: string;
  readonly extractedTextHash: string;
};

export type ResearchSourceCaptureBundle = {
  readonly bundleId: string;
  readonly capturedAt: number;
  readonly captures: readonly ResearchSourceCapture[];
  readonly htmlCaptureCount: number;
  readonly pdfCaptureCount: number;
};

export type ResearchSourceCaptureBundleIssueCode =
  | "insufficient_html_captures"
  | "missing_pdf_capture"
  | "missing_capture_metadata";

export type ResearchSourceCaptureBundleIssue = {
  readonly code: ResearchSourceCaptureBundleIssueCode;
  readonly captureId?: string;
  readonly message: string;
};

export type ResearchSourceCaptureBundleValidation = {
  readonly valid: boolean;
  readonly issues: readonly ResearchSourceCaptureBundleIssue[];
};

export type ResearchSourceCaptureVersion = {
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
  readonly extractedTextHash: string;
};

export type ResearchSourceCaptureVersionDiff = {
  readonly sourceId: string;
  readonly previousVersion: number;
  readonly nextVersion: number;
  readonly rawContentChanged: boolean;
  readonly extractedTextChanged: boolean;
};

export function buildResearchSourceCaptureBundle(input: {
  readonly bundleId: string;
  readonly capturedAt: number;
  readonly captures: readonly ResearchSourceCaptureInput[];
}): ResearchSourceCaptureBundle {
  return {
    bundleId: input.bundleId,
    capturedAt: input.capturedAt,
    captures: input.captures.map((capture) => ({
      ...capture,
      status: "succeeded" as const,
      version: 1 as const,
      contentHash: hashContent(capture.rawContent),
      extractedTextHash: hashContent(capture.extractedText),
    })),
    htmlCaptureCount: input.captures.filter((capture) => capture.kind === "web_page").length,
    pdfCaptureCount: input.captures.filter((capture) => capture.kind === "pdf").length,
  };
}

export function classifyResearchCaptureFailure(
  input: ResearchCaptureFailureInput,
): ResearchCaptureFailure {
  if (input.statusCode === 402 || /paywall|payment required/i.test(input.message)) {
    return { kind: "paywall", retryable: false, needsUserAction: true };
  }
  if (input.statusCode === 401 || input.statusCode === 403) {
    return { kind: "permission", retryable: false, needsUserAction: true };
  }
  return { kind: "network", retryable: true, needsUserAction: false };
}

export function validateResearchSourceCaptureBundle(
  bundle: ResearchSourceCaptureBundle,
): ResearchSourceCaptureBundleValidation {
  const issues = [
    ...(bundle.htmlCaptureCount >= 2
      ? []
      : [
          {
            code: "insufficient_html_captures" as const,
            message: "DF-222 requires at least two captured HTML sources.",
          },
        ]),
    ...(bundle.pdfCaptureCount >= 1
      ? []
      : [
          {
            code: "missing_pdf_capture" as const,
            message: "DF-222 requires at least one captured PDF source.",
          },
        ]),
    ...bundle.captures.flatMap(captureMetadataIssues),
  ];

  return { valid: issues.length === 0, issues };
}

export function compareResearchSourceCaptureVersions(input: {
  readonly previous: ResearchSourceCaptureVersion;
  readonly next: ResearchSourceCaptureVersion;
}): ResearchSourceCaptureVersionDiff {
  return {
    sourceId: input.next.id,
    previousVersion: input.previous.version,
    nextVersion: input.next.version,
    rawContentChanged: input.previous.contentHash !== input.next.contentHash,
    extractedTextChanged: input.previous.extractedTextHash !== input.next.extractedTextHash,
  };
}

function captureMetadataIssues(
  capture: ResearchSourceCapture,
): readonly ResearchSourceCaptureBundleIssue[] {
  return [
    ...(isHttpUrl(capture.originalUrl)
      ? []
      : [metadataIssue(capture.id, "original_url is required and must be HTTP(S).")]),
    ...(isHttpUrl(capture.finalUrl)
      ? []
      : [metadataIssue(capture.id, "final_url is required and must be HTTP(S).")]),
    ...(capture.fetchedAt > 0 ? [] : [metadataIssue(capture.id, "fetched_at must be recorded.")]),
    ...(capture.mimeType.trim() ? [] : [metadataIssue(capture.id, "mime_type must be recorded.")]),
    ...(capture.statusCode >= 100 && capture.statusCode <= 599
      ? []
      : [metadataIssue(capture.id, "status_code must be an HTTP status.")]),
    ...(capture.rawArchivePath.trim() &&
    capture.textArchivePath.trim() &&
    capture.rawContent.length > 0 &&
    capture.extractedText.length > 0
      ? []
      : [metadataIssue(capture.id, "raw file and extracted text archives must be preserved.")]),
  ];
}

function metadataIssue(captureId: string, message: string): ResearchSourceCaptureBundleIssue {
  return { code: "missing_capture_metadata", captureId, message };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}
