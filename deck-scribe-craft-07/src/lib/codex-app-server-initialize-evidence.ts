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
    isCanonicalNonBlank(evidence.cliVersion) &&
    Number.isInteger(evidence.requestId) &&
    evidence.requestId > 0 &&
    isCanonicalNonBlank(evidence.response.userAgent) &&
    isCanonicalNonBlank(evidence.response.codexHome) &&
    isCanonicalNonBlank(evidence.response.platformFamily) &&
    isCanonicalNonBlank(evidence.response.platformOs) &&
    evidence.stderrWarnings.every((warning) => !looksLikeJsonRpcProtocolFrame(warning))
  );
}

export function healthTurnEvidenceIsComplete(evidence: {
  readonly threadId: string;
  readonly turnId: string;
}): boolean {
  return isCanonicalNonBlank(evidence.threadId) && isCanonicalNonBlank(evidence.turnId);
}

function isCanonicalNonBlank(value: string): boolean {
  return value.trim().length > 0 && value === value.trim();
}

function looksLikeJsonRpcProtocolFrame(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("{") && trimmed.includes('"jsonrpc"');
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
