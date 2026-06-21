import {
  confirmAndPersistLiveImageBilling,
  type LiveImageBillingConfirmationResult,
} from "./live-image-billing-confirmation";
import {
  ProviderJobCancelledError,
  type ProviderJob,
  type ProviderJobManager,
} from "./provider-job-manager";
import type { SlideImageProviderId } from "./slide-image-provider";

type CancelledBillingKind = Exclude<LiveImageBillingConfirmationResult["kind"], "confirmed">;

export type PreparedCodexImageBillingJob =
  | { readonly kind: "confirmed"; readonly job: ProviderJob }
  | {
      readonly kind: "cancelled";
      readonly reason: CancelledBillingKind;
      readonly job: ProviderJob;
    };

export async function prepareCodexImageBillingJob(input: {
  readonly projectId: string;
  readonly jobId: string;
  readonly providerId: Extract<SlideImageProviderId, "codex">;
  readonly slideCount: number;
  readonly manager: ProviderJobManager;
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

  return {
    kind: "confirmed",
    job: input.manager.recordUsageSummary(input.jobId, {
      imageCount: input.slideCount,
      imageBillingDisclosure: confirmation.disclosure,
    }),
  };
}
