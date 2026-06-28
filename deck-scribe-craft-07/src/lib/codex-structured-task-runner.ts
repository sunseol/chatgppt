import {
  createProviderArtifactProvenance,
  type ProviderArtifactProvenance,
} from "./provider-provenance";

export type StructuredCodexParseResult<TValue> =
  | { readonly kind: "valid"; readonly value: TValue }
  | { readonly kind: "invalid"; readonly issues: readonly string[] };

export type StructuredCodexParser<TValue> = (value: unknown) => StructuredCodexParseResult<TValue>;

export type StructuredCodexEvent =
  | {
      readonly kind: "partial";
      readonly text: string;
      readonly turnId: string;
      readonly threadId: string;
    }
  | {
      readonly kind: "completed";
      readonly payload: unknown;
      readonly turnId: string;
      readonly threadId: string;
      readonly runtime: string;
      readonly promptVersion: string;
      readonly durationMs: number;
      readonly inputArtifactIds: readonly string[];
    };

export type StructuredCodexAccepted<TValue> = {
  readonly kind: "accepted";
  readonly value: TValue;
  readonly provenance: ProviderArtifactProvenance;
};

export type StructuredCodexBlockedCode = "partial_output_not_approvable" | "schema_invalid";

export type StructuredCodexBlocked = {
  readonly kind: "blocked";
  readonly code: StructuredCodexBlockedCode;
  readonly issues: readonly string[];
};

export type StructuredCodexEvaluation<TValue> =
  | StructuredCodexAccepted<TValue>
  | StructuredCodexBlocked;

export function evaluateStructuredCodexOutput<TValue>(input: {
  readonly event: StructuredCodexEvent;
  readonly artifactId: string;
  readonly parse: StructuredCodexParser<TValue>;
}): StructuredCodexEvaluation<TValue> {
  if (input.event.kind === "partial") {
    return {
      kind: "blocked",
      code: "partial_output_not_approvable",
      issues: ["Partial Codex output cannot be saved as an approval artifact."],
    };
  }

  const parsed = input.parse(input.event.payload);
  if (parsed.kind === "invalid") {
    return { kind: "blocked", code: "schema_invalid", issues: parsed.issues };
  }

  return {
    kind: "accepted",
    value: parsed.value,
    provenance: createProviderArtifactProvenance({
      artifactId: input.artifactId,
      executionMode: "production",
      providerKind: "codex",
      authMode: "codex_session",
      modelOrRuntime: input.event.runtime,
      promptVersion: input.event.promptVersion,
      durationMs: input.event.durationMs,
      inputArtifactIds: input.event.inputArtifactIds,
      turnId: input.event.turnId,
      threadId: input.event.threadId,
      fixture: false,
    }),
  };
}
