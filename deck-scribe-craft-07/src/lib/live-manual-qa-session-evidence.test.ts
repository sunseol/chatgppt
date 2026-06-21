import { describe, expect, test } from "bun:test";
import { evaluateLiveManualQaEvidence } from "./live-manual-qa-evidence";
import {
  completeLiveManualQaEvidence as completeEvidence,
  completeLiveManualQaSessionPayload,
} from "./live-manual-qa-test-fixtures";

describe("live manual QA session evidence", () => {
  test("blocks developer-local absolute session evidence paths", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePath:
        "/Users/jake/chatgppt/docs/live-evidence/manual-qa/session-20260619.json",
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });

  test("blocks file URL session evidence paths", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePath:
        "file:///Users/jake/chatgppt/docs/live-evidence/manual-qa/session-20260619.json",
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });

  test("blocks generic JSON paths that are not manual QA session bundles", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePath: "manual-qa/notes-20260619.json",
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });

  test("blocks session paths outside the committed live evidence bundle", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePath: "manual-qa/session-20260619.json",
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });

  test("blocks manual QA session notes paths as observed-session evidence", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePath: "manual-qa/session-notes-20260619.json",
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });

  test("blocks generic manual QA session paths as observed-session evidence", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePath: "manual-qa/session-generic-20260619.json",
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });

  test("blocks template session evidence paths", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePath: "manual-qa/session-template-20260619.json",
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });

  test("blocks temporary manual QA session evidence paths", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePath: "docs/live-evidence/manual-qa/tmp-session-20260619.json",
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });

  test("blocks session evidence paths that rely on boundary whitespace", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePath: " docs/live-evidence/manual-qa/session-20260619.json ",
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });

  test("blocks borrowed manual QA session payloads from another evidence path", () => {
    // Given
    const evidence = completeEvidence({
      sessionEvidencePayload: {
        ...completeLiveManualQaSessionPayload(completeEvidence()),
        evidencePath: "docs/live-evidence/manual-qa/session-20260620.json",
      },
    });

    // When
    const result = evaluateLiveManualQaEvidence(evidence);

    // Then
    expect(result.kind === "blocked" ? result.issues.map((issue) => issue.code) : []).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
  });
});
