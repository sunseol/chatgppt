import type { ProviderKind } from "./provider-types";

export type ExecutionMode = "test" | "development" | "production";

export type ProviderAuthMode = "none" | "codex_session" | "api_key" | "local";

export type ProviderArtifactProvenance = {
  readonly artifactId: string;
  readonly executionMode: ExecutionMode;
  readonly providerKind: ProviderKind;
  readonly authMode: ProviderAuthMode;
  readonly modelOrRuntime: string;
  readonly promptVersion: string;
  readonly durationMs: number;
  readonly inputArtifactIds: readonly string[];
  readonly fixture: boolean;
  readonly requestId?: string;
  readonly turnId?: string;
  readonly threadId?: string;
};

export type ProviderArtifactProvenanceInput = ProviderArtifactProvenance;

export type ProviderProvenanceIssueCode =
  | "missing_provenance"
  | "missing_artifact_id"
  | "missing_model_or_runtime"
  | "missing_prompt_version"
  | "invalid_duration"
  | "missing_thread_or_turn"
  | "missing_request_id"
  | "mock_lineage_contamination"
  | "fixture_lineage_contamination";

export type ProviderProvenanceIssue = {
  readonly code: ProviderProvenanceIssueCode;
  readonly artifactId?: string;
  readonly message: string;
};

export type ProviderProvenanceValidationResult =
  | { readonly kind: "complete" }
  | { readonly kind: "incomplete"; readonly issues: readonly ProviderProvenanceIssue[] };

export type ProviderApprovalProvenanceGate =
  | { readonly kind: "ready" }
  | { readonly kind: "blocked"; readonly issues: readonly ProviderProvenanceIssue[] };

export type LineageContaminationReport = {
  readonly mockArtifactIds: readonly string[];
  readonly fixtureArtifactIds: readonly string[];
};

export function createProviderArtifactProvenance(
  input: ProviderArtifactProvenanceInput,
): ProviderArtifactProvenance {
  return {
    artifactId: input.artifactId,
    executionMode: input.executionMode,
    providerKind: input.providerKind,
    authMode: input.authMode,
    modelOrRuntime: input.modelOrRuntime,
    promptVersion: input.promptVersion,
    durationMs: input.durationMs,
    inputArtifactIds: input.inputArtifactIds,
    fixture: input.fixture,
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.turnId === undefined ? {} : { turnId: input.turnId }),
    ...(input.threadId === undefined ? {} : { threadId: input.threadId }),
  };
}

export function validateProviderArtifactProvenance(
  provenance: ProviderArtifactProvenance,
): ProviderProvenanceValidationResult {
  const issues = [...commonIssues(provenance), ...identityIssues(provenance)];

  return issues.length === 0 ? { kind: "complete" } : { kind: "incomplete", issues };
}

export function evaluateApprovalProvenanceGate(
  lineage: readonly ProviderArtifactProvenance[],
): ProviderApprovalProvenanceGate {
  if (lineage.length === 0) {
    return {
      kind: "blocked",
      issues: [{ code: "missing_provenance", message: "Approval requires provider provenance." }],
    };
  }

  const validationIssues = lineage.flatMap((item) => {
    const result = validateProviderArtifactProvenance(item);
    return result.kind === "complete" ? [] : result.issues;
  });
  const contaminationIssues = contaminationToIssues(collectLineageContamination(lineage));
  const issues = [...validationIssues, ...contaminationIssues];

  return issues.length === 0 ? { kind: "ready" } : { kind: "blocked", issues };
}

export function collectLineageContamination(
  lineage: readonly ProviderArtifactProvenance[],
): LineageContaminationReport {
  return {
    mockArtifactIds: lineage
      .filter((item) => item.providerKind === "mock")
      .map((item) => item.artifactId),
    fixtureArtifactIds: lineage.filter((item) => item.fixture).map((item) => item.artifactId),
  };
}

function commonIssues(provenance: ProviderArtifactProvenance): readonly ProviderProvenanceIssue[] {
  return [
    ...(provenance.artifactId.trim().length > 0
      ? []
      : [issue("missing_artifact_id", provenance, "Artifact id is required.")]),
    ...(provenance.modelOrRuntime.trim().length > 0
      ? []
      : [issue("missing_model_or_runtime", provenance, "Model or runtime is required.")]),
    ...(provenance.promptVersion.trim().length > 0
      ? []
      : [issue("missing_prompt_version", provenance, "Prompt version is required.")]),
    ...(Number.isFinite(provenance.durationMs) && provenance.durationMs >= 0
      ? []
      : [issue("invalid_duration", provenance, "Duration must be a non-negative number.")]),
  ];
}

function identityIssues(
  provenance: ProviderArtifactProvenance,
): readonly ProviderProvenanceIssue[] {
  if (provenance.providerKind === "codex" && (!provenance.turnId || !provenance.threadId)) {
    return [
      issue(
        "missing_thread_or_turn",
        provenance,
        "Codex artifacts require both turn id and thread id.",
      ),
    ];
  }

  if (provenance.providerKind === "openaiImage" && !provenance.requestId) {
    return [
      issue("missing_request_id", provenance, "Image artifacts require a provider request id."),
    ];
  }

  return [];
}

function contaminationToIssues(
  report: LineageContaminationReport,
): readonly ProviderProvenanceIssue[] {
  return [
    ...report.mockArtifactIds.map((artifactId) => ({
      code: "mock_lineage_contamination" as const,
      artifactId,
      message: `Mock artifact ${artifactId} is not allowed in production lineage.`,
    })),
    ...report.fixtureArtifactIds.map((artifactId) => ({
      code: "fixture_lineage_contamination" as const,
      artifactId,
      message: `Fixture artifact ${artifactId} is not allowed in production lineage.`,
    })),
  ];
}

function issue(
  code: ProviderProvenanceIssueCode,
  provenance: ProviderArtifactProvenance,
  message: string,
): ProviderProvenanceIssue {
  return { code, artifactId: provenance.artifactId, message };
}
