import { hasNonSyntheticEvidencePath } from "../src/lib/live-evidence-path";
import type { Df205PackagedAuthSecretInput } from "./df205-packaged-auth-secret-evidence-schema";
export {
  Df205PackagedAuthSecretInputError,
  parseDf205PackagedAuthSecretInput,
  parseDf205PackagedAuthSecretJson,
} from "./df205-packaged-auth-secret-evidence-schema";

export type Df205PackagedAuthSecretEvidence = {
  readonly capturedAt: string;
  readonly evidenceKind: "df205-packaged-auth-secret-evidence";
  readonly status: "ready" | "blocked";
  readonly packageArchiveSha256: string;
  readonly authSessionId: string;
  readonly accountMode: Df205PackagedAuthSecretInput["authSession"]["accountMode"];
  readonly keychainFallbackInstalled: boolean | null;
  readonly releaseBlockers: readonly string[];
};

export function produceDf205PackagedAuthSecretEvidence(
  input: Df205PackagedAuthSecretInput,
): Df205PackagedAuthSecretEvidence {
  const releaseBlockers = [
    ...packageBlockers(input),
    ...authSessionBlockers(input),
    ...freshLoginBlockers(input),
    ...evidencePathBlockers(input),
    ...logoutReloginBlockers(input),
    ...codexImageCapabilityBlockers(input),
    ...keychainBlockers(input),
    ...secretLeakScanBlockers(input),
  ];
  return {
    capturedAt: input.capturedAt,
    evidenceKind: "df205-packaged-auth-secret-evidence",
    status: releaseBlockers.length === 0 ? "ready" : "blocked",
    packageArchiveSha256: input.packageArchiveSha256,
    authSessionId: input.authSession.sessionId,
    accountMode: input.authSession.accountMode,
    keychainFallbackInstalled: keychainFallbackInstalled(input),
    releaseBlockers,
  };
}

function packageBlockers(input: Df205PackagedAuthSecretInput): readonly string[] {
  return [
    ...(input.authSession.packageArchiveSha256 === input.packageArchiveSha256
      ? []
      : ["DF-205 auth session package hash does not match the release package"]),
    ...(input.secretLeakScan.packageArchiveSha256 === input.packageArchiveSha256
      ? []
      : ["DF-205 secret leak scan package hash does not match the release package"]),
  ];
}

function authSessionBlockers(input: Df205PackagedAuthSecretInput): readonly string[] {
  return input.authSession.captureKind === "packaged_clean_account"
    ? []
    : ["DF-205 auth session was not captured from a packaged clean-account login run"];
}

function freshLoginBlockers(input: Df205PackagedAuthSecretInput): readonly string[] {
  return input.freshLogin.captureKind === "packaged_clean_account"
    ? []
    : ["DF-205 fresh login evidence was not captured from a packaged clean-account run"];
}

function evidencePathBlockers(input: Df205PackagedAuthSecretInput): readonly string[] {
  return [
    ...jsonPathBlockers(input.freshLogin.evidencePath, "fresh login"),
    ...jsonPathBlockers(input.logoutRelogin.evidencePath, "logout/relogin"),
    ...jsonPathBlockers(input.codexImageCapability.evidencePath, "Codex image capability"),
    ...jsonPathBlockers(input.secretLeakScan.evidencePath, "secret leak scan"),
    ...(input.keychainLifecycle.captureKind === "packaged_run_os_keychain_fallback"
      ? jsonPathBlockers(input.keychainLifecycle.evidencePath, "keychain lifecycle")
      : []),
  ];
}

function logoutReloginBlockers(input: Df205PackagedAuthSecretInput): readonly string[] {
  const proof = input.logoutRelogin;
  return [
    ...(proof.captureKind === "packaged_clean_account"
      ? []
      : ["DF-205 logout/relogin evidence was not captured from a packaged clean-account run"]),
    ...(proof.logoutObserved && proof.reloginObserved
      ? []
      : ["DF-205 logout/relogin proof is incomplete"]),
    ...(proof.liveJobsCancelled
      ? []
      : ["DF-205 logout/relogin proof does not cancel active live jobs"]),
    ...(proof.providerActionsLockedWhileLoggedOut
      ? []
      : ["DF-205 logout/relogin proof does not lock providers while logged out"]),
    ...(proof.postReloginProviderReady
      ? []
      : ["DF-205 logout/relogin proof does not restore provider readiness"]),
  ];
}

function codexImageCapabilityBlockers(input: Df205PackagedAuthSecretInput): readonly string[] {
  return [
    ...(input.codexImageCapability.captureKind === "packaged_clean_account"
      ? []
      : [
          "DF-205 packaged Codex OAuth image capability was not captured from a packaged clean-account run",
        ]),
    ...(input.codexImageCapability.imageGenerationAvailable
      ? []
      : ["DF-205 packaged Codex OAuth image capability is not available"]),
  ];
}

function keychainBlockers(input: Df205PackagedAuthSecretInput): readonly string[] {
  const lifecycle = input.keychainLifecycle;
  if (lifecycle.captureKind === "not_recorded") {
    return ["DF-205 keychain fallback lifecycle was not recorded for the packaged run"];
  }
  if (lifecycle.captureKind === "packaged_run_no_api_key_fallback") return [];
  return lifecycle.writeSucceeded && lifecycle.readSucceeded && lifecycle.deleteSucceeded
    ? []
    : ["DF-205 packaged keychain lifecycle proof is incomplete"];
}

function keychainFallbackInstalled(input: Df205PackagedAuthSecretInput): boolean | null {
  switch (input.keychainLifecycle.captureKind) {
    case "not_recorded":
      return null;
    case "packaged_run_no_api_key_fallback":
      return false;
    case "packaged_run_os_keychain_fallback":
      return true;
  }
}

function secretLeakScanBlockers(input: Df205PackagedAuthSecretInput): readonly string[] {
  const hits = [
    ...input.secretLeakScan.configuredSecretHits,
    ...input.secretLeakScan.authJsonHits,
    ...input.secretLeakScan.bearerTokenHits,
    ...input.secretLeakScan.localPathHits,
  ];
  return [
    ...(input.secretLeakScan.captureKind === "signed_packaged_clean_machine"
      ? []
      : [
          "DF-205 packaged secret leak scan was not captured from a clean-machine signed package run",
        ]),
    ...(hits.length === 0 ? [] : ["DF-205 packaged secret leak scan has hits"]),
  ];
}

function jsonPathBlockers(path: string, label: string): readonly string[] {
  return path.startsWith("docs/live-evidence/") && hasNonSyntheticEvidencePath(path, [".json"])
    ? []
    : [`DF-205 ${label} evidence path is not committed JSON`];
}
