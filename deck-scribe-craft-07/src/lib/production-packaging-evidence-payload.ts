import { z } from "zod";
import {
  CLEAN_MACHINE_STEPS,
  type CleanMachineStep,
  type CleanMachineStepEvidencePaths,
} from "./production-packaging-clean-machine";
import type { ProductionPackagingIssue } from "./production-packaging-evidence";
import type { NativeMacosReleaseTrust } from "./production-packaging-release-trust";

export type CleanMachineStepPayloads = {
  readonly [Step in CleanMachineStep]?: unknown;
};

export type ProductionPackagingEvidencePayloads = {
  readonly releaseTrust?: unknown;
  readonly cleanMachineAccount?: unknown;
  readonly cleanMachineSteps?: CleanMachineStepPayloads;
};

type ProductionPackagingPayloadInput = {
  readonly packagePath: string;
  readonly packageSha256: string;
  readonly nativeMacosBundlePath: string;
  readonly nativeMacosBundleSha256: string;
  readonly nativeMacosReleaseTrust: NativeMacosReleaseTrust;
  readonly cleanMachineStepEvidencePaths?: CleanMachineStepEvidencePaths;
  readonly cleanMachineAccountEvidencePath?: string;
  readonly evidencePayloads?: ProductionPackagingEvidencePayloads;
};

const SHA_256_HEX = /^[a-f0-9]{64}$/;

const ReleaseTrustCommandSchema = z
  .object({
    status: z.literal("passed"),
    exitCode: z.literal(0),
  })
  .strict();

const ReleaseTrustPayloadSchema = z
  .object({
    kind: z.literal("macos_release_trust"),
    evidencePath: z.string().min(1),
    packagePath: z.string().min(1),
    packageSha256: z.string().regex(SHA_256_HEX),
    nativeMacosBundlePath: z.string().min(1),
    nativeMacosBundleSha256: z.string().regex(SHA_256_HEX),
    signature: z.literal("developer_id"),
    teamIdentifier: z.string().regex(/^[A-Z0-9]{10}$/),
    notarizationStatus: z.literal("accepted"),
    stapled: z.literal(true),
    gatekeeperAccepted: z.literal(true),
    commands: z
      .object({
        codesign: ReleaseTrustCommandSchema,
        notarytool: ReleaseTrustCommandSchema,
        stapler: ReleaseTrustCommandSchema,
        spctl: ReleaseTrustCommandSchema,
      })
      .strict(),
  })
  .strict();

const CleanMachineAccountPayloadSchema = z
  .object({
    kind: z.literal("clean_macos_account"),
    evidencePath: z.string().min(1),
    accountType: z.literal("clean_macos_account"),
    macosUsername: z.string().min(1),
    homeDirectory: z.string().min(1),
    developerAccount: z.literal(false),
    capturedAt: z.string().datetime(),
  })
  .strict();

const CleanMachineStepPayloadSchema = z
  .object({
    kind: z.literal("clean_machine_step"),
    step: z.enum(CLEAN_MACHINE_STEPS),
    evidencePath: z.string().min(1),
    accountEvidencePath: z.string().min(1),
    macosUsername: z.string().min(1),
    homeDirectory: z.string().min(1),
    status: z.literal("passed"),
    capturedAt: z.string().datetime(),
  })
  .strict();

type CleanMachineAccountPayload = z.infer<typeof CleanMachineAccountPayloadSchema>;

const RELEASE_TRUST_BASE_BLOCKERS = [
  "missing_production_package",
  "missing_package_hash",
  "missing_native_macos_bundle",
  "missing_developer_id_signature",
  "missing_release_trust_evidence",
  "missing_notarization",
  "missing_gatekeeper_acceptance",
  "package_not_production_mode",
] as const;

const CLEAN_MACHINE_STEP_BASE_BLOCKERS = [
  "invalid_clean_machine_step",
  "duplicate_clean_machine_step",
  "missing_clean_machine_step",
  "missing_clean_machine_step_evidence",
] as const;

export function productionPackagingPayloadIssues(
  input: ProductionPackagingPayloadInput,
  existingIssues: readonly ProductionPackagingIssue[],
): readonly ProductionPackagingIssue[] {
  return [
    ...releaseTrustPayloadIssues(input, existingIssues),
    ...cleanMachineAccountPayloadIssues(input, existingIssues),
    ...cleanMachineStepPayloadIssues(input, existingIssues),
  ];
}

function releaseTrustPayloadIssues(
  input: ProductionPackagingPayloadInput,
  existingIssues: readonly ProductionPackagingIssue[],
): readonly ProductionPackagingIssue[] {
  if (hasAnyIssue(existingIssues, RELEASE_TRUST_BASE_BLOCKERS)) return [];
  const parsed = ReleaseTrustPayloadSchema.safeParse(input.evidencePayloads?.releaseTrust);
  return parsed.success &&
    parsed.data.evidencePath === input.nativeMacosReleaseTrust.releaseTrustEvidencePath &&
    parsed.data.packagePath === input.packagePath &&
    parsed.data.packageSha256 === input.packageSha256 &&
    parsed.data.nativeMacosBundlePath === input.nativeMacosBundlePath &&
    parsed.data.nativeMacosBundleSha256 === input.nativeMacosBundleSha256 &&
    parsed.data.teamIdentifier === input.nativeMacosReleaseTrust.teamIdentifier
    ? []
    : [
        issue(
          "missing_release_trust_evidence",
          "Native macOS release trust evidence payload must prove codesign, notarization, stapling, and Gatekeeper assessment.",
          [input.nativeMacosReleaseTrust.releaseTrustEvidencePath || "missing"],
        ),
      ];
}

function cleanMachineAccountPayloadIssues(
  input: ProductionPackagingPayloadInput,
  existingIssues: readonly ProductionPackagingIssue[],
): readonly ProductionPackagingIssue[] {
  if (hasIssue(existingIssues, "missing_clean_machine_account_evidence")) return [];
  return validCleanMachineAccountPayload(input) !== undefined
    ? []
    : [
        issue(
          "missing_clean_machine_account_evidence",
          "Clean-machine account evidence payload must prove a fresh non-developer macOS account.",
          [input.cleanMachineAccountEvidencePath || "missing"],
        ),
      ];
}

function cleanMachineStepPayloadIssues(
  input: ProductionPackagingPayloadInput,
  existingIssues: readonly ProductionPackagingIssue[],
): readonly ProductionPackagingIssue[] {
  if (hasAnyIssue(existingIssues, CLEAN_MACHINE_STEP_BASE_BLOCKERS)) return [];
  if (hasIssue(existingIssues, "missing_clean_machine_account_evidence")) return [];
  const accountPayload = validCleanMachineAccountPayload(input);
  if (accountPayload === undefined) return [];
  const missing = CLEAN_MACHINE_STEPS.filter(
    (step) => !hasValidCleanMachineStepPayload(input, step, accountPayload),
  );
  return missing.length === 0
    ? []
    : [
        issue(
          "missing_clean_machine_step_evidence",
          "Clean-machine step evidence payloads must match their checklist step and persisted path.",
          missing,
        ),
      ];
}

function hasValidCleanMachineStepPayload(
  input: ProductionPackagingPayloadInput,
  step: CleanMachineStep,
  accountPayload: CleanMachineAccountPayload,
): boolean {
  const parsed = CleanMachineStepPayloadSchema.safeParse(
    input.evidencePayloads?.cleanMachineSteps?.[step],
  );
  return (
    parsed.success &&
    parsed.data.step === step &&
    parsed.data.evidencePath === input.cleanMachineStepEvidencePaths?.[step] &&
    parsed.data.accountEvidencePath === input.cleanMachineAccountEvidencePath &&
    parsed.data.macosUsername === accountPayload.macosUsername &&
    parsed.data.homeDirectory === accountPayload.homeDirectory
  );
}

function validCleanMachineAccountPayload(
  input: ProductionPackagingPayloadInput,
): CleanMachineAccountPayload | undefined {
  const parsed = CleanMachineAccountPayloadSchema.safeParse(
    input.evidencePayloads?.cleanMachineAccount,
  );
  return parsed.success && parsed.data.evidencePath === input.cleanMachineAccountEvidencePath
    ? parsed.data
    : undefined;
}

function hasAnyIssue(
  issues: readonly ProductionPackagingIssue[],
  codes: readonly ProductionPackagingIssue["code"][],
): boolean {
  return codes.some((code) => hasIssue(issues, code));
}

function hasIssue(
  issues: readonly ProductionPackagingIssue[],
  code: ProductionPackagingIssue["code"],
): boolean {
  return issues.some((issue) => issue.code === code);
}

function issue(
  code: ProductionPackagingIssue["code"],
  message: string,
  refs: readonly string[],
): ProductionPackagingIssue {
  return { code, message, refs };
}
