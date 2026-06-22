import { hasNonSyntheticEvidencePath } from "../src/lib/live-evidence-path";
import {
  evaluateLiveUsageSummary,
  type LiveUsageStageSummary,
  type LiveUsageSummaryResult,
} from "../src/lib/live-usage-summary";
import type { Df244PackagedUsageInput } from "./df244-packaged-usage-evidence-schema";
export {
  Df244PackagedUsageInputError,
  parseDf244PackagedUsageInput,
  parseDf244PackagedUsageJson,
} from "./df244-packaged-usage-evidence-schema";

export type Df244PackagedUsageEvidence = {
  readonly capturedAt: string;
  readonly evidenceKind: "df244-packaged-usage-evidence";
  readonly status: "ready" | "blocked";
  readonly packageArchiveSha256: string;
  readonly usageValidation: LiveUsageSummaryResult;
  readonly stage: LiveUsageStageSummary;
  readonly displayEvidence: Df244PackagedUsageInput["displayEvidence"];
  readonly releaseBlockers: readonly string[];
};

export function produceDf244PackagedUsageEvidence(
  input: Df244PackagedUsageInput,
): Df244PackagedUsageEvidence {
  const stage = usageStage(input);
  const usageValidation = evaluateLiveUsageSummary([stage]);
  const releaseBlockers = [
    ...(usageValidation.kind === "ready" ? [] : ["DF-244 usage summary validation is blocked"]),
    ...consistencyBlockers(input),
    ...displayBlockers(input.displayEvidence),
  ];
  return {
    capturedAt: input.capturedAt,
    evidenceKind: "df244-packaged-usage-evidence",
    status: releaseBlockers.length === 0 ? "ready" : "blocked",
    packageArchiveSha256: input.packageArchiveSha256,
    usageValidation,
    stage,
    displayEvidence: input.displayEvidence,
    releaseBlockers,
  };
}

function usageStage(input: Df244PackagedUsageInput): LiveUsageStageSummary {
  return {
    stageId: `generate_${input.productRunSummary.jobId}`,
    jobId: input.productRunSummary.jobId,
    providerKind: "codex",
    durationMs: input.usageSummary.totalLatencyMs,
    retryCount: retryCount(input),
    providerUsageProvided: true,
    usage: {
      imageCount: input.usageSummary.imageCount,
      imageBillingDisclosure: {
        apiKeyRequired: input.confirmationRecord.apiKeyRequired,
        userConfirmed: true,
        label: input.confirmationRecord.label,
        confirmationEvidencePath: input.confirmationRecord.evidencePath,
      },
    },
    costLabel: "hidden",
  };
}

function retryCount(input: Df244PackagedUsageInput): number {
  const attempts = input.productRunSummary.jobs
    .filter((job) => job.id === input.productRunSummary.jobId)
    .map((job) => job.attempt);
  return Math.max(1, ...attempts) - 1;
}

function consistencyBlockers(input: Df244PackagedUsageInput): readonly string[] {
  return [
    ...(input.productRunSummary.evidenceKind === "packaged-live-codex-generate-export-smoke"
      ? []
      : ["DF-244 product run was not captured from the packaged app surface"]),
    ...(sameRunIdentity(input)
      ? []
      : ["DF-244 confirmation record does not match the packaged run"]),
    ...(input.usageSummary.confirmationEvidencePath === input.confirmationRecord.evidencePath
      ? []
      : ["DF-244 usage summary does not cite the persisted confirmation evidence"]),
    ...(input.usageSummary.confirmationRecordPath.endsWith(input.confirmationRecord.evidencePath)
      ? []
      : ["DF-244 usage summary does not cite the confirmation record path"]),
    ...(input.usageSummary.confirmationRecordPath.startsWith("docs/live-evidence/")
      ? []
      : ["DF-244 confirmation record was not copied into committed evidence bundle"]),
    ...(input.usageSummary.imageCount === input.productRunSummary.slides.length
      ? []
      : ["DF-244 image count does not match the packaged run slides"]),
    ...(input.productRunSummary.slides.every((slide) =>
      slide.artifactPath.startsWith("docs/live-evidence/"),
    )
      ? []
      : ["DF-244 packaged image artifact path is not committed evidence"]),
    ...(input.usageSummary.totalLatencyMs === totalLatencyMs(input)
      ? []
      : ["DF-244 latency does not match the packaged run turns"]),
    ...(input.productRunSummary.appServerTurns.every((turn) => turn.errors.length === 0)
      ? []
      : ["DF-244 packaged run contains App Server errors"]),
  ];
}

function sameRunIdentity(input: Df244PackagedUsageInput): boolean {
  return (
    input.productRunSummary.projectId === input.usageSummary.projectId &&
    input.productRunSummary.projectId === input.confirmationRecord.projectId &&
    input.productRunSummary.jobId === input.confirmationRecord.jobId &&
    input.usageSummary.confirmedAt === input.confirmationRecord.confirmedAt
  );
}

function totalLatencyMs(input: Df244PackagedUsageInput): number {
  return input.productRunSummary.appServerTurns.reduce((sum, turn) => sum + turn.durationMs, 0);
}

function displayBlockers(
  displayEvidence: Df244PackagedUsageInput["displayEvidence"],
): readonly string[] {
  const complete =
    isDisplayEvidencePath(displayEvidence.evidencePath) &&
    displayEvidence.latencyVisible &&
    displayEvidence.retryCountVisible &&
    displayEvidence.imageCountVisible &&
    displayEvidence.confirmationVisible;
  return complete ? [] : ["DF-244 usage display evidence is incomplete"];
}

function isDisplayEvidencePath(path: string): boolean {
  return (
    path.startsWith("docs/live-evidence/") &&
    hasNonSyntheticEvidencePath(path, [".png", ".mp4", ".html"])
  );
}
