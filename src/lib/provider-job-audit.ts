import type { PromptStage, PromptUsageRecord, PromptVersion, CorePromptId } from "./prompt-assets";
import type { ProviderCapability } from "./provider-types";
import type { ProviderJob, ProviderJobStatus, ProviderUsageSummary } from "./provider-job-manager";
import { redactSensitiveText } from "./redaction";

export interface ProviderJobPromptUsage {
  readonly promptId: CorePromptId;
  readonly promptVersion: PromptVersion;
  readonly promptHash: string;
  readonly promptFilePath: string;
  readonly stage: PromptStage;
}

export interface ProviderJobAuditEvent {
  readonly eventType: "provider.job.completed";
  readonly jobId: string;
  readonly providerId: string;
  readonly capability: ProviderCapability;
  readonly status: ProviderJobStatus;
  readonly attempt: number;
  readonly promptUsage?: ProviderJobPromptUsage;
  readonly usageSummary?: ProviderUsageSummary;
  readonly errorMessage?: string;
}

export function createProviderJobAuditEvent(
  job: ProviderJob,
  promptUsage?: PromptUsageRecord,
): ProviderJobAuditEvent {
  return {
    eventType: "provider.job.completed",
    jobId: job.id,
    providerId: job.providerId,
    capability: job.capability,
    status: job.status,
    attempt: job.attempt,
    ...(promptUsage === undefined ? {} : { promptUsage: toPromptUsageAudit(promptUsage) }),
    ...(job.usageSummary === undefined ? {} : { usageSummary: job.usageSummary }),
    ...(job.errorMessage === undefined
      ? {}
      : { errorMessage: redactSensitiveText(job.errorMessage) }),
  };
}

function toPromptUsageAudit(promptUsage: PromptUsageRecord): ProviderJobPromptUsage {
  return {
    promptId: promptUsage.promptId,
    promptVersion: promptUsage.promptVersion,
    promptHash: promptUsage.promptHash,
    promptFilePath: promptUsage.promptFilePath,
    stage: promptUsage.stage,
  };
}
