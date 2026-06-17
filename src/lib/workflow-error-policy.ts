import type { StepKey } from "./deck-types";
import type {
  WorkflowDraftRecovery,
  WorkflowErrorKind,
  WorkflowErrorRecord,
} from "./workflow-error-types";
import { redactSensitiveText } from "./redaction";

export type CreateWorkflowErrorInput = {
  readonly id: string;
  readonly kind: WorkflowErrorKind;
  readonly stage: StepKey;
  readonly cause: string;
  readonly retryable: boolean;
  readonly blocksFinalApproval?: boolean;
};

export type CreateSaveFailureWorkflowErrorInput = {
  readonly id: string;
  readonly stage: StepKey;
  readonly cause: string;
  readonly draftLabel: string;
  readonly draft: unknown;
  readonly now: () => number;
};

export function createWorkflowError(input: CreateWorkflowErrorInput): WorkflowErrorRecord {
  return {
    id: input.id,
    kind: input.kind,
    stage: input.stage,
    cause: summarizeCause(input.cause),
    retryable: input.retryable,
    recoveryAction: recoveryAction(input.kind, input.retryable),
    blocksFinalApproval: input.blocksFinalApproval ?? !input.retryable,
  };
}

export function createSaveFailureWorkflowError(
  input: CreateSaveFailureWorkflowErrorInput,
): WorkflowErrorRecord {
  const draftRecovery: WorkflowDraftRecovery = {
    label: input.draftLabel,
    serializedDraft: serializeDraft(input.draft),
    createdAt: input.now(),
  };
  return {
    ...createWorkflowError({
      id: input.id,
      kind: "save",
      stage: input.stage,
      cause: input.cause,
      retryable: true,
      blocksFinalApproval: true,
    }),
    draftRecovery,
  };
}

export function workflowErrorBlocksFinalApproval(error: WorkflowErrorRecord): boolean {
  return error.blocksFinalApproval;
}

function summarizeCause(cause: string): string {
  const redacted = redactSensitiveText(cause);
  return (
    redacted
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("at ")) ??
    "오류 원인을 확인할 수 없습니다."
  );
}

function recoveryAction(kind: WorkflowErrorKind, retryable: boolean): string {
  switch (kind) {
    case "provider":
      return retryable
        ? "공급자 연결 상태와 인증을 확인한 뒤 다시 시도하세요."
        : "공급자 설정 또는 인증 문제를 해결해야 다음 단계로 진행할 수 있습니다.";
    case "render":
      return retryable
        ? "렌더 입력을 유지한 채 다시 생성하세요."
        : "렌더러 안전성 문제를 해결한 뒤 레이아웃을 다시 생성하세요.";
    case "save":
      return "임시 복구본을 보존했습니다. 저장 공간과 권한을 확인한 뒤 다시 저장하세요.";
    case "transform":
      return retryable
        ? "변환 입력을 확인하고 레이어 변환을 다시 실행하세요."
        : "편집 레이어 산출물을 재생성해야 최종 승인으로 진행할 수 있습니다.";
    default:
      return assertNever(kind);
  }
}

function serializeDraft(draft: unknown): string {
  try {
    return JSON.stringify(draft);
  } catch (error) {
    if (error instanceof TypeError) return JSON.stringify({ recovery: "unserializable_draft" });
    throw error;
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected workflow error kind: ${String(value)}`);
}
