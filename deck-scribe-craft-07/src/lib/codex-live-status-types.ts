import type { ProductionTextWorkflowBridgeStatus } from "./production-text-workflow-gate";

export type CodexStatusActionError = {
  readonly title: string;
  readonly cause: string;
  readonly action: string;
  readonly retryLabel: string;
  readonly rawMessage: string;
};

export type CodexLoginStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "running" }
  | { readonly kind: "opening" }
  | { readonly kind: "opened"; readonly command: string }
  | { readonly kind: "completed"; readonly success: boolean; readonly output: string }
  | { readonly kind: "missing" }
  | { readonly kind: "failed"; readonly message: string };

export type CodexSmokeStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "running" }
  | {
      readonly kind: "completed";
      readonly threadId: string;
      readonly turnId: string;
      readonly accountType: string;
    }
  | { readonly kind: "missing" }
  | { readonly kind: "failed"; readonly message: string };

export type CodexWorkflowRunStatus =
  | { readonly kind: "idle" }
  | {
      readonly kind: "running";
      readonly message: string;
      readonly currentStep: string;
      readonly expectedSteps: readonly string[];
      readonly cancelRequested: boolean;
    }
  | {
      readonly kind: "succeeded";
      readonly message: string;
      readonly currentStep?: string;
      readonly expectedSteps?: readonly string[];
    }
  | { readonly kind: "cancelled"; readonly message: string }
  | {
      readonly kind: "failed";
      readonly message: string;
      readonly error?: CodexStatusActionError;
    };

export type CodexLiveStatusKind =
  | "bridge_missing"
  | "bridge_detected"
  | "login_checking"
  | "login_required"
  | "smoke_checking"
  | "verified"
  | "running"
  | "succeeded"
  | "failed";

export type CodexLiveStatusView = {
  readonly kind: CodexLiveStatusKind;
  readonly label: string;
  readonly summary: string;
  readonly detail: string;
  readonly actionLabel: string;
  readonly isVerified: boolean;
  readonly canAttemptWorkflow: boolean;
  readonly canCancel: boolean;
  readonly error?: CodexStatusActionError;
};

export type CodexLiveStatusInput = {
  readonly bridge: ProductionTextWorkflowBridgeStatus;
  readonly login: CodexLoginStatus;
  readonly smoke: CodexSmokeStatus;
  readonly workflow: CodexWorkflowRunStatus;
};
