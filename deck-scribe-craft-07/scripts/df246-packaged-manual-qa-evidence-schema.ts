import { z } from "zod";

const SetupTaskSchema = z.enum(["new_project", "login_check", "prompt_input"]);
const ApprovalTargetSchema = z.enum(["research_pack", "slide_generation", "export"]);
const ExportSchema = z.enum(["png", "project", "report"]);
const SeveritySchema = z.enum(["P0", "P1", "P2"]);

const ApprovalTargetCheckSchema = z
  .object({
    targetId: ApprovalTargetSchema,
    understood: z.boolean(),
  })
  .strict();

const IssueLogEntrySchema = z
  .object({
    severity: SeveritySchema,
    title: z.string(),
    description: z.string(),
  })
  .strict();

const ManualQaSessionEvidenceSchema = z
  .object({
    testerRole: z.enum(["non_developer", "developer"]),
    sessionEvidencePath: z.string().min(1),
    sessionEvidencePayload: z.unknown(),
    sessionDurationMs: z.number().int().nonnegative(),
    setupTasks: z.array(SetupTaskSchema),
    approvalTargetChecks: z.array(ApprovalTargetCheckSchema),
    openedRealSourceUrls: z.array(z.string()),
    finalReportSourceUrls: z.array(z.string()),
    regeneratedSlideIds: z.array(z.string()),
    editedTitleSlideIds: z.array(z.string()),
    openedExports: z.array(ExportSchema),
    criticalErrorCount: z.number().int().nonnegative(),
    mockIndicatorCount: z.number().int().nonnegative(),
    placeholderOutputCount: z.number().int().nonnegative(),
    severityIssueListPresent: z.boolean(),
    issueLog: z.array(IssueLogEntrySchema),
  })
  .strict();

const PackagedManualQaInputSchema = z
  .object({
    capturedAt: z.string().min(1),
    packageArchiveSha256: z.string().min(1),
    manualQaCandidatePackageSha256: z.string().min(1),
    checklistPath: z.literal("docs/live-manual-qa-checklist.md"),
    packageRecheckPath: z.literal("docs/live-evidence/release/df245-package-recheck-20260622.json"),
    sessionEvidence: ManualQaSessionEvidenceSchema.optional(),
  })
  .strict();

export type Df246PackagedManualQaInput = z.infer<typeof PackagedManualQaInputSchema>;

export class Df246PackagedManualQaInputError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid DF-246 packaged manual QA input: ${issues.join("; ")}`);
    this.name = "Df246PackagedManualQaInputError";
    this.issues = issues;
  }
}

export function parseDf246PackagedManualQaInput(value: unknown): Df246PackagedManualQaInput {
  const parsed = PackagedManualQaInputSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Df246PackagedManualQaInputError(
    parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`),
  );
}

export function parseDf246PackagedManualQaJson(raw: string): Df246PackagedManualQaInput {
  try {
    return parseDf246PackagedManualQaInput(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df246PackagedManualQaInputError([error.message]);
    }
    throw error;
  }
}
