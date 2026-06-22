import {
  confirmAndPersistLiveImageBilling,
  type LiveImageBillingConfirmationResult,
  writeLiveImageBillingConfirmationEvidence,
} from "./live-image-billing-confirmation";
import { ImageArtifactStoreError, type ImageArtifactStore } from "./image-artifact-store";
import {
  ProviderJobCancelledError,
  type ProviderJob,
  type ProviderJobManager,
} from "./provider-job-manager";
import type { SlideImageProviderId } from "./slide-image-provider";

type CancelledBillingKind = Exclude<LiveImageBillingConfirmationResult["kind"], "confirmed">;
type CancelledCodexImageBillingKind = CancelledBillingKind | "evidence_write_failed";

export type PreparedCodexImageBillingJob =
  | { readonly kind: "confirmed"; readonly job: ProviderJob }
  | {
      readonly kind: "cancelled";
      readonly reason: CancelledCodexImageBillingKind;
      readonly job: ProviderJob;
    };

export async function prepareCodexImageBillingJob(input: {
  readonly projectId: string;
  readonly jobId: string;
  readonly providerId: Extract<SlideImageProviderId, "codex">;
  readonly slideCount: number;
  readonly manager: ProviderJobManager;
  readonly evidenceStore?: ImageArtifactStore;
  readonly storage?: Storage;
  readonly confirm?: (message: string) => boolean;
  readonly now?: () => number;
}): Promise<PreparedCodexImageBillingJob> {
  const confirmation = confirmAndPersistLiveImageBilling({
    projectId: input.projectId,
    jobId: input.jobId,
    providerId: input.providerId,
    storage: input.storage,
    confirm: input.confirm,
    now: input.now,
  });

  if (confirmation.kind !== "confirmed") {
    const cancelled = await input.manager.run(input.jobId, async () => {
      throw new ProviderJobCancelledError(input.jobId);
    });
    return { kind: "cancelled", reason: confirmation.kind, job: cancelled };
  }

  if (input.evidenceStore !== undefined) {
    try {
      await writeLiveImageBillingConfirmationEvidence({
        store: input.evidenceStore,
        record: confirmation.record,
      });
    } catch (error) {
      if (error instanceof ImageArtifactStoreError) {
        const cancelled = await input.manager.run(input.jobId, async () => {
          throw new ProviderJobCancelledError(input.jobId);
        });
        return { kind: "cancelled", reason: "evidence_write_failed", job: cancelled };
      }
      throw error;
    }
  }

  return {
    kind: "confirmed",
    job: input.manager.recordUsageSummary(input.jobId, {
      imageCount: input.slideCount,
      imageBillingDisclosure: confirmation.disclosure,
    }),
  };
}
