import type { WorkflowErrorRecord } from "@/lib/workflow-error-types";
import { createWorkflowError } from "@/lib/workflow-error-policy";

export function formatLayoutRenderError(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "레이아웃 렌더러가 안전한 초안을 생성하지 못했습니다. 다시 생성해주세요.";
}

export function createLayoutRenderWorkflowError(error: unknown): WorkflowErrorRecord {
  return createWorkflowError({
    id: "layout_render_error",
    kind: "render",
    stage: "layout",
    cause: formatLayoutRenderError(error),
    retryable: true,
  });
}
