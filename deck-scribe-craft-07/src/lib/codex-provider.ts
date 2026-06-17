import type { ProviderStatus } from "./provider-types";
import type { CodexRuntimeStatus } from "./codex-runtime";

export type CodexAuthEvidence =
  | { readonly kind: "unknown" }
  | { readonly kind: "loggedOut" }
  | { readonly kind: "loggedIn"; readonly accountLabel: string };

export interface CodexProviderStatusInput {
  readonly runtime: CodexRuntimeStatus;
  readonly auth: CodexAuthEvidence;
}

export function createCodexProviderStatus(input: CodexProviderStatusInput): ProviderStatus {
  if (input.runtime.kind !== "ready") {
    return {
      kind: "unavailable",
      providerId: "codex",
      message: `${input.runtime.message} ${input.runtime.remediation}`,
    };
  }

  if (input.auth.kind !== "loggedIn") {
    return {
      kind: "requiresAuth",
      providerId: "codex",
      message: "Sign in with ChatGPT or complete the Codex device-code flow.",
    };
  }

  return {
    kind: "connected",
    providerId: "codex",
    message: `Codex is connected as ${input.auth.accountLabel}.`,
  };
}
