import type { ProviderJobManager, ProviderJobStatus } from "./provider-job-manager";
import type { ProviderStatus } from "./provider-types";
import { secretMaterialCandidates } from "./live-secret-material-candidates";

const IMAGE_SECRET_SERVICE = "deckforge.openai.image";

export type LiveSecretStoreKind = "os_keychain" | "equivalent_secret_store";

export type LiveSecretReference = {
  readonly storeKind: LiveSecretStoreKind;
  readonly service: string;
  readonly account: string;
  readonly secretId: string;
  readonly createdAt: number;
};

export type LiveSecretSaveInput = {
  readonly service: string;
  readonly account: string;
  readonly secretValue: string;
  readonly createdAt: number;
};

export interface LiveSecretStore {
  readonly kind: LiveSecretStoreKind;
  saveSecret(input: LiveSecretSaveInput): Promise<LiveSecretReference>;
  deleteSecret(reference: LiveSecretReference): Promise<void>;
}

export type ImageApiKeyConnectionState = {
  readonly credentialState: "stored";
  readonly secretReference: LiveSecretReference;
  readonly publicLabel: string;
};

export type ImageApiKeyDisconnectedState = {
  readonly credentialState: "missing";
  readonly publicLabel: string;
};

export type LiveAuthFailureKind =
  | "login_expired"
  | "unauthorized"
  | "insufficient_permission"
  | "organization_verification_required"
  | "unknown";

export type LiveAuthFailureInput = {
  readonly statusCode?: number;
  readonly reason?: string;
  readonly providerMessage?: string;
};

export type LiveAuthFailure = {
  readonly kind: LiveAuthFailureKind;
  readonly userMessage: string;
};

export type LogoutCancellationResult = {
  readonly cancelledJobIds: readonly string[];
};

export type LiveAuthLogoutLockState = LogoutCancellationResult & {
  readonly uiLocked: true;
  readonly providerStatuses: readonly ProviderStatus[];
};

export class LiveSecretInputError extends Error {
  constructor() {
    super("Image API key must be non-empty before it can be stored.");
    this.name = "LiveSecretInputError";
  }
}

export class LiveSecretReferenceError extends Error {
  constructor() {
    super("Secret store returned a reference containing raw secret material.");
    this.name = "LiveSecretReferenceError";
  }
}

export class LiveSecretReferenceScopeError extends Error {
  constructor() {
    super("Secret store returned a reference for the wrong scope.");
    this.name = "LiveSecretReferenceScopeError";
  }
}

export class LiveSecretReferenceTimestampError extends Error {
  constructor() {
    super("Secret store returned a reference with drifted timestamp.");
    this.name = "LiveSecretReferenceTimestampError";
  }
}

export class LiveSecretReferenceIdentityError extends Error {
  constructor() {
    super("Secret store returned an invalid reference identity.");
    this.name = "LiveSecretReferenceIdentityError";
  }
}

export class LiveSecretStoreKindError extends Error {
  constructor() {
    super("Secret store returned an unsupported store kind.");
    this.name = "LiveSecretStoreKindError";
  }
}

export async function connectImageApiKeySecret(input: {
  readonly apiKey: string;
  readonly store: LiveSecretStore;
  readonly account: string;
  readonly now: () => number;
}): Promise<ImageApiKeyConnectionState> {
  const trimmed = input.apiKey.trim();
  if (trimmed.length === 0) throw new LiveSecretInputError();
  const createdAt = input.now();

  const secretReference = await input.store.saveSecret({
    service: IMAGE_SECRET_SERVICE,
    account: input.account,
    secretValue: trimmed,
    createdAt,
  });
  if (!isExpectedStoreKind(secretReference.storeKind, input.store.kind))
    throw new LiveSecretStoreKindError();
  if (secretReference.service !== IMAGE_SECRET_SERVICE || secretReference.account !== input.account)
    throw new LiveSecretReferenceScopeError();
  if (secretReference.createdAt !== createdAt) throw new LiveSecretReferenceTimestampError();
  if (!hasCanonicalSecretReferenceIdentity(secretReference))
    throw new LiveSecretReferenceIdentityError();
  if (secretReferenceContainsRawSecret(secretReference, trimmed))
    throw new LiveSecretReferenceError();

  return {
    credentialState: "stored",
    secretReference,
    publicLabel: `${secretReference.storeKind}: ${secretReference.account}`,
  };
}

export async function disconnectImageApiKeySecret(input: {
  readonly reference: LiveSecretReference;
  readonly store: LiveSecretStore;
}): Promise<ImageApiKeyDisconnectedState> {
  if (!isExpectedStoreKind(input.reference.storeKind, input.store.kind))
    throw new LiveSecretStoreKindError();
  if (input.reference.service !== IMAGE_SECRET_SERVICE) throw new LiveSecretReferenceScopeError();
  if (!hasCanonicalSecretReferenceIdentity(input.reference))
    throw new LiveSecretReferenceIdentityError();
  await input.store.deleteSecret(input.reference);
  return {
    credentialState: "missing",
    publicLabel: "OpenAI image API key is not configured.",
  };
}

export function classifyLiveAuthFailure(input: LiveAuthFailureInput): LiveAuthFailure {
  const evidenceText = normalizedAuthFailureEvidence(input);
  if (input.statusCode === 401 && isExpiredLoginEvidence(evidenceText)) {
    return {
      kind: "login_expired",
      userMessage: "Live login expired. Sign in again before continuing.",
    };
  }
  if (input.statusCode === 401) {
    return {
      kind: "unauthorized",
      userMessage: "Live provider rejected the current credentials.",
    };
  }
  if (input.statusCode === 403 && isOrganizationVerificationEvidence(evidenceText)) {
    return {
      kind: "organization_verification_required",
      userMessage: "OpenAI organization verification is required before image generation.",
    };
  }
  if (input.statusCode === 403) {
    return {
      kind: "insufficient_permission",
      userMessage: "The current account does not have permission for this live operation.",
    };
  }
  return {
    kind: "unknown",
    userMessage: "Live authentication failed for an unknown reason.",
  };
}

function normalizedAuthFailureEvidence(input: LiveAuthFailureInput): string {
  return `${input.reason ?? ""} ${input.providerMessage ?? ""}`
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function isExpiredLoginEvidence(text: string): boolean {
  return (
    text.includes("session expired") ||
    text.includes("login expired") ||
    (text.includes("expired") &&
      (text.includes("session") || text.includes("login") || text.includes("sign in")))
  );
}

function isOrganizationVerificationEvidence(text: string): boolean {
  const namesOrganization = text.includes("organization") || /\borg\b/.test(text);
  return (
    text.includes("organization verification") ||
    text.includes("org verification") ||
    (namesOrganization &&
      (text.includes("verify") || text.includes("verified") || text.includes("verification")))
  );
}

export function cancelLiveJobsForAuthLogout(input: {
  readonly manager: ProviderJobManager;
  readonly providerIds: readonly string[];
}): LogoutCancellationResult {
  const cancelledJobIds: string[] = [];
  for (const job of input.manager.snapshot()) {
    if (!input.providerIds.includes(job.providerId) || !isActiveJob(job.status)) continue;
    input.manager.requestCancellation(job.id);
    cancelledJobIds.push(job.id);
  }
  return { cancelledJobIds };
}

export function createLiveAuthLogoutLockState(input: {
  readonly manager: ProviderJobManager;
  readonly providerIds: readonly string[];
  readonly message: string;
}): LiveAuthLogoutLockState {
  const cancellation = cancelLiveJobsForAuthLogout({
    manager: input.manager,
    providerIds: input.providerIds,
  });
  return {
    ...cancellation,
    uiLocked: true,
    providerStatuses: input.providerIds.map((providerId) => ({
      kind: "requiresAuth",
      providerId,
      message: input.message,
    })),
  };
}

function isActiveJob(status: ProviderJobStatus): boolean {
  return status === "queued" || status === "running";
}

function isExpectedStoreKind(value: string, expected: LiveSecretStoreKind): boolean {
  return value === "os_keychain" && expected === "os_keychain";
}

function hasCanonicalSecretReferenceIdentity(reference: LiveSecretReference): boolean {
  return [reference.service, reference.account, reference.secretId].every(isCanonicalReferenceText);
}

function isCanonicalReferenceText(value: string): boolean {
  return value.trim() !== "" && value === value.trim();
}

function secretReferenceContainsRawSecret(
  reference: LiveSecretReference,
  rawSecret: string,
): boolean {
  const secretCandidates = secretMaterialCandidates(rawSecret);
  return [reference.service, reference.account, reference.secretId].some((field) =>
    secretCandidates.some((candidate) => field.includes(candidate)),
  );
}
