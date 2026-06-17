import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createWorkflowError, createSaveFailureWorkflowError } from "@/lib/workflow-error-policy";
import { ActionableErrorPanel } from "./ActionableErrorPanel";

describe("actionable error panel", () => {
  test("renders stage cause retryability and recovery action", () => {
    const markup = renderToStaticMarkup(
      <ActionableErrorPanel
        error={createWorkflowError({
          id: "err_render",
          kind: "render",
          stage: "layout",
          cause: "Sandbox blocked script execution.",
          retryable: true,
        })}
        onRetry={() => undefined}
      />,
    );

    expect(markup.includes("오류 단계")).toBe(true);
    expect(markup.includes("layout")).toBe(true);
    expect(markup.includes("Sandbox blocked script execution.")).toBe(true);
    expect(markup.includes("재시도 가능")).toBe(true);
    expect(markup.includes("복구 액션")).toBe(true);
  });

  test("renders save recovery snapshot without exposing raw draft structure as logs", () => {
    const markup = renderToStaticMarkup(
      <ActionableErrorPanel
        error={createSaveFailureWorkflowError({
          id: "err_save_panel",
          stage: "editor",
          cause: "QuotaExceededError",
          draftLabel: "Editor draft",
          draft: { title: "보존할 제목" },
          now: () => 123,
        })}
      />,
    );

    expect(markup.includes("임시 복구본")).toBe(true);
    expect(markup.includes("Editor draft")).toBe(true);
    expect(markup.includes("보존할 제목")).toBe(false);
  });
});
