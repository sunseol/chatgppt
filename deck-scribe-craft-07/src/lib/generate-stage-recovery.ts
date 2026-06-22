import type { ProviderJob } from "./provider-job-manager";
import {
  findRecoveredProviderJob,
  parseProviderJobRecoverySnapshot,
  providerJobRecoveryKey,
  serializeProviderJobRecoverySnapshot,
  type ProviderJobRecoverySnapshot,
} from "./provider-job-recovery";

const GENERATE_STEP = "generate";

export type GenerateRecovery = {
  readonly snapshot: ProviderJobRecoverySnapshot;
  readonly job: ProviderJob;
};

export function readGenerateRecovery(
  projectId: string,
  storage: Storage | undefined = getBrowserStorage(),
): GenerateRecovery | undefined {
  if (storage === undefined) return undefined;
  const snapshot = parseProviderJobRecoverySnapshot(
    storage.getItem(providerJobRecoveryKey(projectId, GENERATE_STEP)),
  );
  if (snapshot === undefined) return undefined;
  const job = findRecoveredProviderJob(snapshot, snapshot.currentJobId);
  return job === undefined ? undefined : { snapshot, job };
}

export function writeGenerateRecovery(input: {
  readonly projectId: string;
  readonly currentJobId: string;
  readonly jobs: readonly ProviderJob[];
  readonly storage?: Storage;
}): void {
  const storage = input.storage ?? getBrowserStorage();
  if (storage === undefined) return;
  storage.setItem(
    providerJobRecoveryKey(input.projectId, GENERATE_STEP),
    serializeProviderJobRecoverySnapshot({
      projectId: input.projectId,
      step: GENERATE_STEP,
      currentJobId: input.currentJobId,
      jobs: input.jobs,
    }),
  );
}

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}
