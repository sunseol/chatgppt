import { z } from "zod";
import type { ImageArtifactStore, ImageArtifactStoreWrite } from "./image-artifact-store";
import type { ProviderImageBillingDisclosure } from "./provider-job-manager";
import type { SlideImageProviderId } from "./slide-image-provider";

const CONFIRMATION_TYPE = "deckforge_live_image_billing_confirmation";
const STORAGE_VERSION = 1;
const STORAGE_KEY = "deckforge.live-image-billing-confirmations.v1";
const DISCLOSURE_LABEL = "Codex image usage confirmed";
const CONFIRMATION_MESSAGE =
  "Codex OAuth image generation may use the signed-in Codex account. Provider cost is hidden unless Codex returns a usage amount.";

export type LiveImageBillingConfirmationRecord = {
  readonly type: typeof CONFIRMATION_TYPE;
  readonly version: typeof STORAGE_VERSION;
  readonly projectId: string;
  readonly jobId: string;
  readonly providerId: Extract<SlideImageProviderId, "codex">;
  readonly evidencePath: string;
  readonly label: typeof DISCLOSURE_LABEL;
  readonly apiKeyRequired: false;
  readonly billingOwner: "codex_oauth_account";
  readonly confirmedAt: number;
};

type LiveImageBillingConfirmationStore = {
  readonly version: typeof STORAGE_VERSION;
  readonly records: readonly LiveImageBillingConfirmationRecord[];
};

export type LiveImageBillingConfirmationResult =
  | {
      readonly kind: "confirmed";
      readonly record: LiveImageBillingConfirmationRecord;
      readonly disclosure: ProviderImageBillingDisclosure;
    }
  | { readonly kind: "declined" }
  | { readonly kind: "unavailable"; readonly reason: "storage_unavailable" | "confirm_unavailable" }
  | { readonly kind: "failed"; readonly reason: "storage_write_failed" };

const ConfirmationRecordSchema: z.ZodType<LiveImageBillingConfirmationRecord> = z
  .object({
    type: z.literal(CONFIRMATION_TYPE),
    version: z.literal(STORAGE_VERSION),
    projectId: z.string().min(1),
    jobId: z.string().min(1),
    providerId: z.literal("codex"),
    evidencePath: z.string().min(1),
    label: z.literal(DISCLOSURE_LABEL),
    apiKeyRequired: z.literal(false),
    billingOwner: z.literal("codex_oauth_account"),
    confirmedAt: z.number().int().nonnegative(),
  })
  .strict();

const ConfirmationStoreSchema: z.ZodType<LiveImageBillingConfirmationStore> = z
  .object({
    version: z.literal(STORAGE_VERSION),
    records: z.array(ConfirmationRecordSchema),
  })
  .strict();

export function confirmAndPersistLiveImageBilling(input: {
  readonly projectId: string;
  readonly jobId: string;
  readonly providerId: Extract<SlideImageProviderId, "codex">;
  readonly storage?: Storage;
  readonly confirm?: (message: string) => boolean;
  readonly now?: () => number;
}): LiveImageBillingConfirmationResult {
  const storage = input.storage ?? getBrowserStorage();
  if (storage === undefined) return { kind: "unavailable", reason: "storage_unavailable" };
  const confirm = input.confirm ?? getBrowserConfirm();
  if (confirm === undefined) return { kind: "unavailable", reason: "confirm_unavailable" };
  if (!confirm(CONFIRMATION_MESSAGE)) return { kind: "declined" };

  const record = createLiveImageBillingConfirmationRecord(input);
  return persistLiveImageBillingConfirmationRecord(storage, record)
    ? { kind: "confirmed", record, disclosure: disclosureFromRecord(record) }
    : { kind: "failed", reason: "storage_write_failed" };
}

export function readLiveImageBillingConfirmationRecord(
  storage: Storage,
  evidencePath: string,
): LiveImageBillingConfirmationRecord | undefined {
  return readConfirmationStore(storage).records.find(
    (record) => record.evidencePath === evidencePath,
  );
}

export async function writeLiveImageBillingConfirmationEvidence(input: {
  readonly store: ImageArtifactStore;
  readonly record: LiveImageBillingConfirmationRecord;
}): Promise<ImageArtifactStoreWrite> {
  const write = {
    path: confirmationArtifactPath(input.record),
    content: JSON.stringify(input.record, null, 2),
  };
  await input.store.write(write);
  return write;
}

function createLiveImageBillingConfirmationRecord(input: {
  readonly projectId: string;
  readonly jobId: string;
  readonly providerId: Extract<SlideImageProviderId, "codex">;
  readonly now?: () => number;
}): LiveImageBillingConfirmationRecord {
  const evidencePath = [
    "usage",
    safeEvidenceSegment(input.projectId),
    safeEvidenceSegment(input.jobId),
    "image-billing-confirmation.json",
  ].join("/");
  return {
    type: CONFIRMATION_TYPE,
    version: STORAGE_VERSION,
    projectId: input.projectId,
    jobId: input.jobId,
    providerId: input.providerId,
    evidencePath,
    label: DISCLOSURE_LABEL,
    apiKeyRequired: false,
    billingOwner: "codex_oauth_account",
    confirmedAt: input.now?.() ?? Date.now(),
  };
}

function persistLiveImageBillingConfirmationRecord(
  storage: Storage,
  record: LiveImageBillingConfirmationRecord,
): boolean {
  const current = readConfirmationStore(storage);
  const records = [
    record,
    ...current.records.filter((stored) => stored.evidencePath !== record.evidencePath),
  ];
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, records }));
    return true;
  } catch (error) {
    if (error instanceof Error) return false;
    throw error;
  }
}

function readConfirmationStore(storage: Storage): LiveImageBillingConfirmationStore {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return emptyStore();
    const parsed = ConfirmationStoreSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyStore();
  } catch (error) {
    if (error instanceof Error) return emptyStore();
    throw error;
  }
}

function emptyStore(): LiveImageBillingConfirmationStore {
  return { version: STORAGE_VERSION, records: [] };
}

function disclosureFromRecord(
  record: LiveImageBillingConfirmationRecord,
): ProviderImageBillingDisclosure {
  return {
    apiKeyRequired: record.apiKeyRequired,
    userConfirmed: true,
    label: record.label,
    confirmationEvidencePath: record.evidencePath,
  };
}

function confirmationArtifactPath(record: LiveImageBillingConfirmationRecord): string {
  return ["projects", safeEvidenceSegment(record.projectId), record.evidencePath].join("/");
}

function safeEvidenceSegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "unknown";
}

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function getBrowserConfirm(): ((message: string) => boolean) | undefined {
  return typeof window === "undefined" ? undefined : (message) => window.confirm(message);
}
