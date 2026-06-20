import type {
  CodexAppServerInitializeSmokeEvidence,
  CodexAppServerInitializeSmokeStatus,
} from "./codex-app-server-initialize-smoke";

type InitializedEvidence = Extract<
  CodexAppServerInitializeSmokeEvidence,
  { readonly kind: "initialized" }
>;

export function initializedEvidenceIsComplete(evidence: InitializedEvidence): boolean {
  return (
    evidence.cliVersion.trim().length > 0 &&
    Number.isInteger(evidence.requestId) &&
    evidence.requestId > 0 &&
    evidence.response.userAgent.trim().length > 0 &&
    evidence.response.codexHome.trim().length > 0 &&
    evidence.response.platformFamily.trim().length > 0 &&
    evidence.response.platformOs.trim().length > 0
  );
}

export function failedInitializeSmokeStatus(input: {
  readonly transport: InitializedEvidence["transport"];
  readonly exitCode: number;
}): CodexAppServerInitializeSmokeStatus {
  return {
    kind: "failed",
    transport: input.transport,
    exitCode: input.exitCode,
    message: "Codex App Server initialize smoke failed.",
    remediation: "Inspect app-server stderr and retry initialize before starting Live text jobs.",
    retryable: true,
  };
}
