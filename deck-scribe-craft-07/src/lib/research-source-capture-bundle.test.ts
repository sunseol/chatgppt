import { describe, expect, test } from "bun:test";
import {
  buildResearchSourceCaptureBundle,
  classifyResearchCaptureFailure,
  compareResearchSourceCaptureVersions,
  validateResearchSourceCaptureBundle,
} from "./research-source-capture-bundle";

describe("research source capture bundle", () => {
  test("records archive path, extracted text, metadata, and hashes for two HTML and one PDF captures", () => {
    const bundle = buildResearchSourceCaptureBundle({
      bundleId: "capture_df222",
      capturedAt: 1_789_300_000,
      captures: [
        {
          id: "html_001",
          kind: "web_page",
          sourceType: "government",
          originalUrl: "https://example.gov/report",
          finalUrl: "https://example.gov/report",
          fetchedAt: 1_789_300_001,
          mimeType: "text/html",
          statusCode: 200,
          rawContent: "<html><main>Official report body</main></html>",
          extractedText: "Official report body",
          rawArchivePath: "sources/html_001/original.html",
          textArchivePath: "sources/html_001/extracted.txt",
        },
        {
          id: "html_002",
          kind: "web_page",
          sourceType: "government",
          originalUrl: "https://example.gov/second",
          finalUrl: "https://cdn.example.gov/second",
          fetchedAt: 1_789_300_003,
          mimeType: "text/html",
          statusCode: 200,
          rawContent: "<html><main>Second official body</main></html>",
          extractedText: "Second official body",
          rawArchivePath: "sources/html_002/original.html",
          textArchivePath: "sources/html_002/extracted.txt",
        },
        {
          id: "pdf_001",
          kind: "pdf",
          sourceType: "international",
          originalUrl: "https://example.org/report.pdf",
          finalUrl: "https://example.org/report.pdf",
          fetchedAt: 1_789_300_002,
          mimeType: "application/pdf",
          statusCode: 200,
          rawContent: "%PDF binary text marker",
          extractedText: "PDF report body",
          rawArchivePath: "sources/pdf_001/original.pdf",
          textArchivePath: "sources/pdf_001/extracted.txt",
        },
      ],
    });

    expect(bundle.htmlCaptureCount).toBe(2);
    expect(bundle.pdfCaptureCount).toBe(1);
    expect(bundle.captures.every((capture) => capture.status === "succeeded")).toBe(true);
    expect(bundle.captures.every((capture) => capture.contentHash.startsWith("sha256:"))).toBe(
      true,
    );
    expect(
      bundle.captures.every((capture) => capture.extractedTextHash.startsWith("sha256:")),
    ).toBe(true);
    expect(validateResearchSourceCaptureBundle(bundle)).toEqual({ valid: true, issues: [] });
  });

  test("blocks bundles missing required HTML PDF counts or capture metadata", () => {
    const bundle = buildResearchSourceCaptureBundle({
      bundleId: "capture_incomplete",
      capturedAt: 1_789_300_000,
      captures: [
        {
          id: "html_001",
          kind: "web_page",
          sourceType: "government",
          originalUrl: "not a url",
          finalUrl: "",
          fetchedAt: 0,
          mimeType: "",
          statusCode: 99,
          rawContent: "",
          extractedText: "",
          rawArchivePath: "",
          textArchivePath: "",
        },
      ],
    });

    expect(validateResearchSourceCaptureBundle(bundle).issues.map((issue) => issue.code)).toEqual([
      "insufficient_html_captures",
      "missing_pdf_capture",
      "missing_capture_metadata",
      "missing_capture_metadata",
      "missing_capture_metadata",
      "missing_capture_metadata",
      "missing_capture_metadata",
      "missing_capture_metadata",
    ]);
  });

  test("classifies access failures without collapsing them into generic retryable errors", () => {
    expect(
      classifyResearchCaptureFailure({ statusCode: 402, message: "Payment Required" }),
    ).toEqual({
      kind: "paywall",
      retryable: false,
      needsUserAction: true,
    });
    expect(classifyResearchCaptureFailure({ statusCode: 403, message: "Forbidden" })).toEqual({
      kind: "permission",
      retryable: false,
      needsUserAction: true,
    });
    expect(classifyResearchCaptureFailure({ statusCode: 504, message: "Gateway Timeout" })).toEqual(
      {
        kind: "network",
        retryable: true,
        needsUserAction: false,
      },
    );
  });

  test("records version and hash changes when a source is recaptured", () => {
    const diff = compareResearchSourceCaptureVersions({
      previous: {
        id: "html_001",
        version: 1,
        contentHash: "sha256:old",
        extractedTextHash: "sha256:text-old",
      },
      next: {
        id: "html_001",
        version: 2,
        contentHash: "sha256:new",
        extractedTextHash: "sha256:text-old",
      },
    });

    expect(diff).toEqual({
      sourceId: "html_001",
      previousVersion: 1,
      nextVersion: 2,
      rawContentChanged: true,
      extractedTextChanged: false,
    });
  });
});
