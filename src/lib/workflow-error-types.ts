import type { StepKey } from "./deck-types";

export type WorkflowErrorKind = "provider" | "render" | "save" | "transform";

export interface WorkflowDraftRecovery {
  readonly label: string;
  readonly serializedDraft: string;
  readonly createdAt: number;
}

export interface WorkflowErrorRecord {
  readonly id: string;
  readonly kind: WorkflowErrorKind;
  readonly stage: StepKey;
  readonly cause: string;
  readonly retryable: boolean;
  readonly recoveryAction: string;
  readonly blocksFinalApproval: boolean;
  readonly draftRecovery?: WorkflowDraftRecovery;
}
