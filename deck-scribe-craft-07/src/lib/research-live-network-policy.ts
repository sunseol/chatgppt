import type { StepKey } from "./deck-types";
import type { ExecutionMode } from "./provider-provenance";

export type ResearchWebSearchMode = "live" | "cached" | "mock";

export type ResearchLiveSearchScopeResult =
  | { readonly kind: "allowed" }
  | {
      readonly kind: "blocked";
      readonly code: "live_search_outside_research";
      readonly message: string;
    };

export type UntrustedResearchContentBlock = {
  readonly sourceId: string;
  readonly finalUrl: string;
  readonly instructionRole: "untrusted_source_content";
  readonly allowedAsPromptInstruction: false;
  readonly content: string;
};

export type UntrustedResearchContentHazardCode =
  | "shell_command_request"
  | "credential_request"
  | "external_post_request";

export type UntrustedResearchContentHazard = {
  readonly code: UntrustedResearchContentHazardCode;
  readonly executable: false;
  readonly message: string;
};

export type ResearchFallback = "none" | "cached_source" | "mock_source";

export type ResearchFallbackPolicyResult =
  | { readonly kind: "allowed" }
  | {
      readonly kind: "blocked";
      readonly code: "mock_research_fallback_forbidden";
      readonly message: string;
    };

export function evaluateResearchLiveSearchScope(input: {
  readonly step: StepKey;
  readonly webSearch: ResearchWebSearchMode;
}): ResearchLiveSearchScopeResult {
  if (input.webSearch !== "live" || input.step === "research") return { kind: "allowed" };
  return {
    kind: "blocked",
    code: "live_search_outside_research",
    message: "Live web search is only available in the Research step.",
  };
}

export function createUntrustedResearchContentBlock(input: {
  readonly sourceId: string;
  readonly finalUrl: string;
  readonly content: string;
}): UntrustedResearchContentBlock {
  return {
    sourceId: input.sourceId,
    finalUrl: input.finalUrl,
    instructionRole: "untrusted_source_content",
    allowedAsPromptInstruction: false,
    content: input.content,
  };
}

export function detectUntrustedResearchContentHazards(
  content: string,
): readonly UntrustedResearchContentHazard[] {
  return [
    ...(containsShellCommandRequest(content)
      ? [
          hazard(
            "shell_command_request",
            "Fetched source content requested shell command execution.",
          ),
        ]
      : []),
    ...(containsCredentialRequest(content)
      ? [
          hazard(
            "credential_request",
            "Fetched source content requested credentials or secret material.",
          ),
        ]
      : []),
    ...(containsExternalPostRequest(content)
      ? [
          hazard(
            "external_post_request",
            "Fetched source content requested an external POST or upload.",
          ),
        ]
      : []),
  ];
}

export function evaluateResearchFallbackPolicy(input: {
  readonly executionMode: ExecutionMode;
  readonly fallback: ResearchFallback;
}): ResearchFallbackPolicyResult {
  if (input.executionMode !== "production" || input.fallback !== "mock_source") {
    return { kind: "allowed" };
  }
  return {
    kind: "blocked",
    code: "mock_research_fallback_forbidden",
    message: "Production research failures must not be replaced with mock sources.",
  };
}

function containsShellCommandRequest(content: string): boolean {
  return /\b(rm\s+-rf|curl|wget|bash|zsh|sh\s+-c|python\s+-c|osascript)\b/i.test(content);
}

function containsCredentialRequest(content: string): boolean {
  return /\b(OPENAI_API_KEY|API[_ -]?KEY|token|password|secret|id_rsa|credential)\b/i.test(content);
}

function containsExternalPostRequest(content: string): boolean {
  return /\b(POST|curl\s+-X\s+POST|upload|exfiltrate)\b/i.test(content);
}

function hazard(
  code: UntrustedResearchContentHazardCode,
  message: string,
): UntrustedResearchContentHazard {
  return { code, message, executable: false };
}
