import { z } from "zod";
import {
  parseDf205PackagedAuthSecretInput,
  type Df205PackagedAuthSecretInput,
} from "./df205-packaged-auth-secret-evidence-producer";

export const DF205_AUTH_BOOTSTRAP_SMOKE_PATH =
  "docs/live-evidence/lane-e-20260621/auth-bootstrap-smoke.json";
export const DF245_PACKAGE_RECHECK_PATH =
  "docs/live-evidence/release/df245-package-recheck-20260622.json";

const Df205AuthBootstrapSmokeSchema = z
  .object({
    initOk: z.literal(true),
    accountType: z.literal("chatgpt"),
    threadId: z.string().min(1),
    turnId: z.string().min(1),
    turnCompleted: z.literal(true),
    protocolLineCount: z.number().int().positive(),
    stderrLogLineCount: z.number().int().nonnegative(),
    eventMethods: z.array(z.string().min(1)).min(1),
    finalText: z.string().min(1),
  })
  .strict();

const Df245CurrentPackageRecheckSchema = z
  .object({
    capturedAt: z.string().datetime(),
    evidenceKind: z.literal("df245-current-package-recheck"),
    status: z.literal("blocked"),
    packageArchive: z
      .object({
        path: z.literal("dist/deckforge-macos-dry-run.tgz"),
        sha256: z.string().regex(/^[a-f0-9]{64}$/u),
      })
      .passthrough(),
    contentScan: z
      .object({
        localAbsolutePathMarker: z.string().min(1),
        fixedStringHits: z.record(z.array(z.string())),
        regexHits: z.record(z.array(z.string())),
        passed: z.literal(true),
      })
      .passthrough(),
    blockers: z.array(z.string().min(1)).min(1),
  })
  .passthrough();

export type Df205AuthBootstrapSmoke = z.infer<typeof Df205AuthBootstrapSmokeSchema>;
export type Df245CurrentPackageRecheck = z.infer<typeof Df245CurrentPackageRecheckSchema>;

export type Df205CurrentReleaseAuthSecretInputs = {
  readonly authBootstrapSmoke: Df205AuthBootstrapSmoke;
  readonly packageRecheck: Df245CurrentPackageRecheck;
  readonly authBootstrapSmokePath?: string;
  readonly packageRecheckPath?: string;
};

export function parseDf205AuthBootstrapSmoke(value: unknown): Df205AuthBootstrapSmoke {
  return Df205AuthBootstrapSmokeSchema.parse(value);
}

export function parseDf205AuthBootstrapSmokeJson(raw: string): Df205AuthBootstrapSmoke {
  return parseDf205AuthBootstrapSmoke(JSON.parse(raw));
}

export function parseDf245CurrentPackageRecheck(value: unknown): Df245CurrentPackageRecheck {
  return Df245CurrentPackageRecheckSchema.parse(value);
}

export function parseDf245CurrentPackageRecheckJson(raw: string): Df245CurrentPackageRecheck {
  return parseDf245CurrentPackageRecheck(JSON.parse(raw));
}

export function buildDf205PackagedAuthSecretInputFromCurrentEvidence(
  inputs: Df205CurrentReleaseAuthSecretInputs,
): Df205PackagedAuthSecretInput {
  const authBootstrapSmokePath = inputs.authBootstrapSmokePath ?? DF205_AUTH_BOOTSTRAP_SMOKE_PATH;
  const packageRecheckPath = inputs.packageRecheckPath ?? DF245_PACKAGE_RECHECK_PATH;
  const localPathHits =
    inputs.packageRecheck.contentScan.fixedStringHits[
      inputs.packageRecheck.contentScan.localAbsolutePathMarker
    ] ?? [];

  return parseDf205PackagedAuthSecretInput({
    capturedAt: inputs.packageRecheck.capturedAt,
    packageArchiveSha256: inputs.packageRecheck.packageArchive.sha256,
    authSession: {
      sessionId: inputs.authBootstrapSmoke.threadId,
      packageArchiveSha256: inputs.packageRecheck.packageArchive.sha256,
      accountMode: "authenticated_chatgpt_runtime",
      captureKind: "authenticated_runtime_smoke",
    },
    freshLogin: {
      evidencePath: authBootstrapSmokePath,
      captureKind: "authenticated_runtime_smoke",
      codexLoginStatus: "logged_in_using_chatgpt",
      rawTokenPersisted: false,
      authJsonBundled: false,
    },
    logoutRelogin: {
      evidencePath: packageRecheckPath,
      captureKind: "not_recorded",
      logoutObserved: false,
      liveJobsCancelled: false,
      providerActionsLockedWhileLoggedOut: false,
      reloginObserved: false,
      postReloginProviderReady: false,
    },
    codexImageCapability: {
      evidencePath: packageRecheckPath,
      captureKind: "not_recorded",
      providerKind: "codex",
      authMode: "codex_oauth",
      apiKeyRequired: false,
      imageGenerationAvailable: false,
    },
    keychainLifecycle: {
      captureKind: "not_recorded",
    },
    secretLeakScan: {
      evidencePath: packageRecheckPath,
      captureKind: "current_package_recheck",
      packageArchiveSha256: inputs.packageRecheck.packageArchive.sha256,
      configuredSecretHits: [
        ...readFixedStringHits(inputs.packageRecheck, "OPENAI_API_KEY="),
        ...readFixedStringHits(inputs.packageRecheck, "sk-proj-"),
        ...readFixedStringHits(inputs.packageRecheck, "sk-svcacct-"),
        ...readRegexHits(inputs.packageRecheck, "assignedOpenAiApiKey"),
      ],
      authJsonHits: readFixedStringHits(inputs.packageRecheck, "auth.json"),
      bearerTokenHits: readRegexHits(inputs.packageRecheck, "longBearerToken"),
      localPathHits,
    },
  });
}

function readFixedStringHits(
  packageRecheck: Df245CurrentPackageRecheck,
  key: string,
): readonly string[] {
  return packageRecheck.contentScan.fixedStringHits[key] ?? [];
}

function readRegexHits(packageRecheck: Df245CurrentPackageRecheck, key: string): readonly string[] {
  return packageRecheck.contentScan.regexHits[key] ?? [];
}
