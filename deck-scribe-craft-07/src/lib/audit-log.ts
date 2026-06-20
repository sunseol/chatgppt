import type { StepKey } from "./deck-types";
import type {
  ProviderImageBillingDisclosure,
  ProviderJob,
  ProviderUsageSummary,
} from "./provider-job-manager";
import { hasBillingConfirmationEvidencePath } from "./live-usage-billing-evidence";
import { redactSensitiveText } from "./redaction";

export type AuditEventType =
  | "approval.recorded"
  | "provider.job.summary"
  | "artifact.created"
  | "stage.transition"
  | "regeneration.requested"
  | "revision.applied"
  | "export.completed";

export type AuditArtifactLineage = {
  readonly artifactId: string;
  readonly artifactHash?: string;
  readonly artifactType?: string;
  readonly upstreamArtifactIds: readonly string[];
};

export type AuditLogEvent = {
  readonly eventId: string;
  readonly eventType: AuditEventType;
  readonly traceId: string;
  readonly timestamp: number;
  readonly stage: StepKey;
  readonly artifactLineage?: AuditArtifactLineage;
  readonly usageSummary?: ProviderUsageSummary;
  readonly message?: string;
};

export type AuditLogEventInput = {
  readonly eventId: string;
  readonly eventType: AuditEventType;
  readonly traceId: string;
  readonly timestamp: number;
  readonly stage: StepKey;
  readonly artifactLineage?: AuditArtifactLineage;
  readonly usageSummary?: ProviderUsageSummary;
  readonly message?: string;
};

export type ProviderJobSummaryAuditInput = {
  readonly eventId: string;
  readonly traceId: string;
  readonly timestamp: number;
  readonly stage: StepKey;
  readonly artifactLineage?: AuditArtifactLineage;
};

export function createAuditLogEvent(input: AuditLogEventInput): AuditLogEvent {
  const artifactLineage =
    input.artifactLineage === undefined ? undefined : copyArtifactLineage(input.artifactLineage);
  const usageSummary =
    input.usageSummary === undefined ? undefined : copyUsageSummary(input.usageSummary);
  return {
    eventId: input.eventId,
    eventType: input.eventType,
    traceId: input.traceId,
    timestamp: input.timestamp,
    stage: input.stage,
    ...(artifactLineage === undefined ? {} : { artifactLineage }),
    ...(usageSummary === undefined ? {} : { usageSummary }),
    ...(input.message === undefined ? {} : { message: redactSensitiveText(input.message) }),
  };
}

export function createProviderJobSummaryAuditEvent(
  job: ProviderJob,
  input: ProviderJobSummaryAuditInput,
): AuditLogEvent {
  return createAuditLogEvent({
    eventId: input.eventId,
    eventType: "provider.job.summary",
    traceId: input.traceId,
    timestamp: input.timestamp,
    stage: input.stage,
    ...(input.artifactLineage === undefined ? {} : { artifactLineage: input.artifactLineage }),
    ...(job.usageSummary === undefined ? {} : { usageSummary: job.usageSummary }),
    ...(job.errorMessage === undefined ? {} : { message: job.errorMessage }),
  });
}

export function formatAuditLogForReport(events: readonly AuditLogEvent[]): string {
  const out = ["## 11. 감사 로그"];
  if (events.length === 0) {
    out.push("- 없음");
    return out.join("\n");
  }

  events.forEach((event) => {
    const artifact = event.artifactLineage;
    const artifactText =
      artifact === undefined
        ? ""
        : ` · artifact ${artifact.artifactId}${artifact.artifactHash ? ` ${artifact.artifactHash}` : ""}`;
    out.push(
      `- ${new Date(event.timestamp).toISOString()} · ${event.eventId} · ${event.eventType} · ${event.stage} · trace ${event.traceId}${artifactText}`,
    );
    if (artifact !== undefined && artifact.upstreamArtifactIds.length > 0) {
      out.push(`  - Upstream: ${artifact.upstreamArtifactIds.join(", ")}`);
    }
    if (event.usageSummary !== undefined) {
      out.push(`  - Usage: ${formatUsageSummary(event.usageSummary)}`);
    }
    if (event.message !== undefined) {
      out.push(`  - Message: ${event.message}`);
    }
  });
  return out.join("\n");
}

function copyArtifactLineage(lineage: AuditArtifactLineage): AuditArtifactLineage {
  return {
    artifactId: lineage.artifactId,
    upstreamArtifactIds: [...lineage.upstreamArtifactIds],
    ...(lineage.artifactHash === undefined ? {} : { artifactHash: lineage.artifactHash }),
    ...(lineage.artifactType === undefined ? {} : { artifactType: lineage.artifactType }),
  };
}

function copyUsageSummary(summary: ProviderUsageSummary): ProviderUsageSummary {
  return {
    ...(summary.inputTokens === undefined ? {} : { inputTokens: summary.inputTokens }),
    ...(summary.outputTokens === undefined ? {} : { outputTokens: summary.outputTokens }),
    ...(summary.imageCount === undefined ? {} : { imageCount: summary.imageCount }),
    ...(summary.estimatedCostUsd === undefined
      ? {}
      : { estimatedCostUsd: summary.estimatedCostUsd }),
    ...(summary.imageBillingDisclosure === undefined
      ? {}
      : { imageBillingDisclosure: copyImageBillingDisclosure(summary.imageBillingDisclosure) }),
  };
}

function copyImageBillingDisclosure(
  disclosure: ProviderImageBillingDisclosure,
): ProviderImageBillingDisclosure {
  return {
    apiKeyRequired: disclosure.apiKeyRequired,
    userConfirmed: disclosure.userConfirmed,
    label: disclosure.label,
    ...(disclosure.confirmationEvidencePath === undefined
      ? {}
      : { confirmationEvidencePath: disclosure.confirmationEvidencePath }),
  };
}

function formatUsageSummary(summary: ProviderUsageSummary): string {
  const parts = [
    summary.inputTokens === undefined ? "" : `input ${summary.inputTokens}`,
    summary.outputTokens === undefined ? "" : `output ${summary.outputTokens}`,
    summary.imageCount === undefined ? "" : `images ${summary.imageCount}`,
    summary.estimatedCostUsd === undefined
      ? ""
      : `cost estimate $${summary.estimatedCostUsd.toFixed(4)}`,
    imageBillingDisclosureText(summary),
  ].filter((part) => part.length > 0);
  return parts.length === 0 ? "none" : parts.join(" · ");
}

function imageBillingDisclosureText(summary: ProviderUsageSummary): string {
  const disclosure = summary.imageBillingDisclosure;
  if (disclosure === undefined) return "";
  if (!disclosure.userConfirmed) return "API key billing not confirmed";
  if (!hasBillingConfirmationEvidencePath(disclosure.confirmationEvidencePath)) {
    return "API key billing not confirmed";
  }
  const label = disclosure.label.trim();
  return label.length === 0 ? "API key billing not confirmed" : redactSensitiveText(label);
}
