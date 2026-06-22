import { z } from "zod";
import { LIVE_P0_TICKET_IDS } from "../src/lib/live-release-gate";
import { PACKAGED_LIVE_EVIDENCE_TICKET_IDS } from "../src/lib/packaged-live-evidence-index";

const SHA256_HEX = /^[a-f0-9]{64}$/;

const CurrentEvidenceReferenceSchema = z
  .object({
    path: z.string().min(1),
    kind: z.string().min(1),
    sha256: z.string().regex(SHA256_HEX).optional(),
  })
  .strict();

const PackagedLiveEvidenceEntrySchema = z
  .object({
    ticketId: z.enum(PACKAGED_LIVE_EVIDENCE_TICKET_IDS),
    issueNumber: z.number().int().positive(),
    status: z.enum(["ready", "blocked"]),
    validationKind: z.enum(["ready", "blocked"]),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    artifactPath: z.string().min(1),
    artifactSha256: z.string().regex(SHA256_HEX),
  })
  .strict();

const PackagedLiveEvidenceIndexSchema = z
  .object({
    path: z.string().min(1),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    generatedAt: z.string().datetime(),
    entries: z.array(PackagedLiveEvidenceEntrySchema),
  })
  .strict();

const LiveTicketEvidenceSchema = z
  .object({
    id: z.enum(LIVE_P0_TICKET_IDS),
    status: z.enum(["not_started", "verified_mock", "live_partial", "verified_live"]),
  })
  .strict();

const ProductionPackageEvidenceSchema = z
  .object({
    mockExecutionPathDisabled: z.boolean(),
    fixtureFree: z.boolean(),
    contentScanPassed: z.boolean(),
  })
  .strict();

const LiveBenchmarkEvidenceSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(["passed", "failed", "blocked"]),
    failureDomain: z.enum([
      "none",
      "provider",
      "context",
      "research",
      "image",
      "renderer",
      "editor",
    ]),
  })
  .strict();

const ProviderArtifactProvenanceSchema = z
  .object({
    artifactId: z.string().min(1),
    executionMode: z.enum(["test", "development", "production"]),
    providerKind: z.enum(["mock", "codex", "openaiImage", "local"]),
    authMode: z.enum(["none", "codex_session", "api_key", "local"]),
    modelOrRuntime: z.string().min(1),
    promptVersion: z.string().min(1),
    durationMs: z.number().nonnegative(),
    inputArtifactIds: z.array(z.string().min(1)),
    fixture: z.boolean(),
    requestId: z.string().min(1).optional(),
    turnId: z.string().min(1).optional(),
    threadId: z.string().min(1).optional(),
  })
  .strict();

const UnresolvedP1RiskSchema = z
  .object({
    id: z.string().min(1),
    category: z.enum([
      "data_loss",
      "security",
      "billing_misrepresentation",
      "source_error",
      "other",
    ]),
    summary: z.string().min(1),
  })
  .strict();

const ReleaseDecisionEvidenceSchema = z
  .object({
    documentPath: z.string().min(1),
    decision: z.enum(["approved", "blocked"]),
    decisionRecorded: z.boolean(),
    knownLimitsRecorded: z.boolean(),
    decisionPayload: z.unknown().optional(),
  })
  .strict();

const ReleaseGateEvidenceInputSchema = z
  .object({
    p0Tickets: z.array(LiveTicketEvidenceSchema),
    productionPackage: ProductionPackageEvidenceSchema,
    liveBenchmarks: z.array(LiveBenchmarkEvidenceSchema),
    goldenPathLineage: z.array(ProviderArtifactProvenanceSchema),
    goldenPathFinalExportArtifactId: z.string().min(1),
    criticalDefectCount: z.number().int().nonnegative(),
    unresolvedP1Risks: z.array(UnresolvedP1RiskSchema),
    releaseDecision: ReleaseDecisionEvidenceSchema,
  })
  .strict();

const Df247ReleaseGateEvidenceInputSchema = z
  .object({
    capturedAt: z.string().datetime(),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    packagedLiveEvidenceIndex: PackagedLiveEvidenceIndexSchema,
    liveReleaseGate: ReleaseGateEvidenceInputSchema,
    currentEvidence: z.array(CurrentEvidenceReferenceSchema),
  })
  .strict();

export type Df247ReleaseGateEvidenceInput = z.infer<typeof Df247ReleaseGateEvidenceInputSchema>;
export type Df247ReleaseGateEvidenceReference = z.infer<typeof CurrentEvidenceReferenceSchema>;

export class Df247ReleaseGateEvidenceInputError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid DF-247 release gate evidence input: ${issues.join("; ")}`);
    this.name = "Df247ReleaseGateEvidenceInputError";
    this.issues = issues;
  }
}

export function parseDf247ReleaseGateEvidenceInput(value: unknown): Df247ReleaseGateEvidenceInput {
  const parsed = Df247ReleaseGateEvidenceInputSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Df247ReleaseGateEvidenceInputError(
    parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`),
  );
}

export function parseDf247ReleaseGateEvidenceJson(raw: string): Df247ReleaseGateEvidenceInput {
  try {
    return parseDf247ReleaseGateEvidenceInput(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df247ReleaseGateEvidenceInputError([error.message]);
    }
    throw error;
  }
}
