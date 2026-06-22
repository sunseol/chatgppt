import { z } from "zod";

const CleanMachineStepSchema = z.enum([
  "install_app",
  "codex_login",
  "image_credentials",
  "project_launch",
  "live_interview",
]);

const NativeMacosReleaseTrustSchema = z
  .object({
    signature: z.enum(["developer_id", "adhoc", "unsigned"]),
    teamIdentifier: z.string(),
    notarized: z.boolean(),
    stapled: z.boolean(),
    gatekeeperAccepted: z.boolean(),
    releaseTrustEvidencePath: z.string().optional(),
  })
  .strict();

const ContentScanSchema = z
  .object({
    mockResourceHits: z.array(z.string()),
    fixtureHits: z.array(z.string()),
    secretHits: z.array(z.string()),
    testFileHits: z.array(z.string()),
    localPathHits: z.array(z.string()),
  })
  .strict();

const CleanMachineStepEvidencePathsSchema = z
  .object({
    install_app: z.string().optional(),
    codex_login: z.string().optional(),
    image_credentials: z.string().optional(),
    project_launch: z.string().optional(),
    live_interview: z.string().optional(),
  })
  .strict();

const CleanMachineStepPayloadsSchema = z
  .object({
    install_app: z.unknown().optional(),
    codex_login: z.unknown().optional(),
    image_credentials: z.unknown().optional(),
    project_launch: z.unknown().optional(),
    live_interview: z.unknown().optional(),
  })
  .strict();

const EvidencePayloadsSchema = z
  .object({
    releaseTrust: z.unknown().optional(),
    cleanMachineAccount: z.unknown().optional(),
    cleanMachineSteps: CleanMachineStepPayloadsSchema.optional(),
  })
  .strict();

const ProductionPackagingEvidenceSchema = z
  .object({
    packagePath: z.string(),
    packageSha256: z.string(),
    nativeMacosBundlePath: z.string(),
    nativeMacosBundleSha256: z.string(),
    nativeMacosReleaseTrust: NativeMacosReleaseTrustSchema,
    productionMode: z.boolean(),
    contentScan: ContentScanSchema,
    cleanMachineSteps: z.array(CleanMachineStepSchema),
    cleanMachineStepEvidencePaths: CleanMachineStepEvidencePathsSchema.optional(),
    cleanMachineAccountEvidencePath: z.string().optional(),
    evidencePayloads: EvidencePayloadsSchema.optional(),
    runtimeAbsenceRemediationShown: z.boolean(),
    runbookPath: z.string(),
  })
  .strict();

const ProductionPackagingInputSchema = z
  .object({
    capturedAt: z.string().min(1),
    packageArchiveSha256: z.string().min(1),
    packagingEvidence: ProductionPackagingEvidenceSchema,
  })
  .strict();

export type Df245ProductionPackagingInput = z.infer<typeof ProductionPackagingInputSchema>;

export class Df245ProductionPackagingInputError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid DF-245 production packaging input: ${issues.join("; ")}`);
    this.name = "Df245ProductionPackagingInputError";
    this.issues = issues;
  }
}

export function parseDf245ProductionPackagingInput(value: unknown): Df245ProductionPackagingInput {
  const parsed = ProductionPackagingInputSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Df245ProductionPackagingInputError(
    parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`),
  );
}

export function parseDf245ProductionPackagingJson(raw: string): Df245ProductionPackagingInput {
  try {
    return parseDf245ProductionPackagingInput(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df245ProductionPackagingInputError([error.message]);
    }
    throw error;
  }
}
