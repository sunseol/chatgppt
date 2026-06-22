import { z } from "zod";

const FreshLoginSchema = z
  .object({
    evidencePath: z.string().min(1),
    captureKind: z.enum(["packaged_clean_account", "authenticated_runtime_smoke"]),
    codexLoginStatus: z.literal("logged_in_using_chatgpt"),
    rawTokenPersisted: z.literal(false),
    authJsonBundled: z.literal(false),
  })
  .strict();

const LogoutReloginSchema = z
  .object({
    evidencePath: z.string().min(1),
    captureKind: z.enum(["packaged_clean_account", "not_recorded"]),
    logoutObserved: z.boolean(),
    liveJobsCancelled: z.boolean(),
    providerActionsLockedWhileLoggedOut: z.boolean(),
    reloginObserved: z.boolean(),
    postReloginProviderReady: z.boolean(),
  })
  .strict();

const CodexImageCapabilitySchema = z
  .object({
    evidencePath: z.string().min(1),
    captureKind: z.enum(["packaged_clean_account", "not_recorded"]),
    providerKind: z.literal("codex"),
    authMode: z.literal("codex_oauth"),
    apiKeyRequired: z.literal(false),
    imageGenerationAvailable: z.boolean(),
  })
  .strict();

const KeychainLifecycleSchema = z.discriminatedUnion("captureKind", [
  z.object({ captureKind: z.literal("not_recorded") }).strict(),
  z
    .object({
      captureKind: z.literal("packaged_run_no_api_key_fallback"),
      fallbackInstalled: z.literal(false),
    })
    .strict(),
  z
    .object({
      captureKind: z.literal("packaged_run_os_keychain_fallback"),
      fallbackInstalled: z.literal(true),
      evidencePath: z.string().min(1),
      storeKind: z.literal("os_keychain"),
      writeSucceeded: z.boolean(),
      readSucceeded: z.boolean(),
      deleteSucceeded: z.boolean(),
      rawSecretExposed: z.literal(false),
    })
    .strict(),
]);

const SecretLeakScanSchema = z
  .object({
    evidencePath: z.string().min(1),
    captureKind: z.enum(["signed_packaged_clean_machine", "current_package_recheck"]),
    packageArchiveSha256: z.string().min(1),
    configuredSecretHits: z.array(z.string()),
    authJsonHits: z.array(z.string()),
    bearerTokenHits: z.array(z.string()),
    localPathHits: z.array(z.string()),
  })
  .strict();

const AuthSessionSchema = z
  .object({
    sessionId: z.string().min(1),
    packageArchiveSha256: z.string().min(1),
    accountMode: z.enum([
      "clean_macos_account",
      "unauthenticated_account",
      "authenticated_chatgpt_runtime",
    ]),
    captureKind: z.enum(["packaged_clean_account", "authenticated_runtime_smoke"]),
  })
  .strict();

const PackagedAuthSecretInputSchema = z
  .object({
    capturedAt: z.string().min(1),
    packageArchiveSha256: z.string().min(1),
    authSession: AuthSessionSchema,
    freshLogin: FreshLoginSchema,
    logoutRelogin: LogoutReloginSchema,
    codexImageCapability: CodexImageCapabilitySchema,
    keychainLifecycle: KeychainLifecycleSchema,
    secretLeakScan: SecretLeakScanSchema,
  })
  .strict();

export type Df205PackagedAuthSecretInput = z.infer<typeof PackagedAuthSecretInputSchema>;

export class Df205PackagedAuthSecretInputError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid DF-205 packaged auth secret input: ${issues.join("; ")}`);
    this.name = "Df205PackagedAuthSecretInputError";
    this.issues = issues;
  }
}

export function parseDf205PackagedAuthSecretInput(value: unknown): Df205PackagedAuthSecretInput {
  const parsed = PackagedAuthSecretInputSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Df205PackagedAuthSecretInputError(
    parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`),
  );
}

export function parseDf205PackagedAuthSecretJson(raw: string): Df205PackagedAuthSecretInput {
  try {
    return parseDf205PackagedAuthSecretInput(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df205PackagedAuthSecretInputError([error.message]);
    }
    throw error;
  }
}
