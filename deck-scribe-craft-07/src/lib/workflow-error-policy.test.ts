import { describe, expect, test } from "bun:test";
import {
  createWorkflowError,
  createSaveFailureWorkflowError,
  workflowErrorBlocksFinalApproval,
} from "./workflow-error-policy";

describe("workflow error policy", () => {
  test("creates actionable retryable provider errors without raw logs", () => {
    const error = createWorkflowError({
      id: "err_provider",
      kind: "provider",
      stage: "generate",
      cause: "provider timeout\n    at provider.ts token=sk-secret123456789",
      retryable: true,
    });

    expect(error.stage).toBe("generate");
    expect(error.kind).toBe("provider");
    expect(error.cause.includes("provider timeout")).toBe(true);
    expect(error.cause.includes("provider.ts")).toBe(false);
    expect(error.cause.includes("sk-secret")).toBe(false);
    expect(error.retryable).toBe(true);
    expect(error.recoveryAction.includes("다시 시도")).toBe(true);
    expect(workflowErrorBlocksFinalApproval(error)).toBe(false);
  });

  test("preserves draft recovery metadata for save failures", () => {
    const error = createSaveFailureWorkflowError({
      id: "err_save",
      stage: "editor",
      cause: "QuotaExceededError: localStorage failed",
      draftLabel: "Editor draft",
      draft: { title: "보존할 제목" },
      now: () => 123,
    });

    expect(error.kind).toBe("save");
    expect(error.retryable).toBe(true);
    expect(error.blocksFinalApproval).toBe(true);
    expect(error.draftRecovery?.label).toBe("Editor draft");
    expect(error.draftRecovery?.createdAt).toBe(123);
    expect(error.draftRecovery?.serializedDraft.includes("보존할 제목")).toBe(true);
  });

  test("marks fatal transform errors as final approval blockers", () => {
    const error = createWorkflowError({
      id: "err_transform",
      kind: "transform",
      stage: "vectorize",
      cause: "Editable layer graph is inconsistent.",
      retryable: false,
    });

    expect(error.blocksFinalApproval).toBe(true);
    expect(workflowErrorBlocksFinalApproval(error)).toBe(true);
  });
});
