import { z } from "zod";

const ProviderArtifactProvenanceSchema = z
  .object({
    artifactId: z.string(),
    executionMode: z.enum(["test", "development", "production"]),
    providerKind: z.enum(["mock", "codex", "openaiImage", "local"]),
    authMode: z.enum(["none", "codex_session", "api_key", "local"]),
    modelOrRuntime: z.string(),
    promptVersion: z.string(),
    durationMs: z.number(),
    inputArtifactIds: z.array(z.string()),
    fixture: z.boolean(),
    requestId: z.string().optional(),
    turnId: z.string().optional(),
    threadId: z.string().optional(),
  })
  .strict();

const GoldenPathBundleSchema = z
  .object({
    projectId: z.string(),
    finalExportArtifactId: z.string(),
    completedSteps: z.array(
      z.enum([
        "login",
        "live_interview",
        "live_research",
        "live_deck_plan",
        "live_design_system",
        "live_layout_ir",
        "live_image_generation",
        "live_slide_regeneration",
        "title_edit",
        "export",
      ]),
    ),
    reportPath: z.string(),
    reportContent: z.string(),
    reportSignature: z
      .object({ signer: z.string(), signedAt: z.string(), digest: z.string() })
      .strict(),
    screenshots: z.array(z.string()),
    recordingPath: z.string(),
    finalValidationBundle: z
      .object({
        path: z.string(),
        finalExportArtifactId: z.string(),
        reportDigest: z.string(),
        screenshotPaths: z.array(z.string()),
        recordingPath: z.string(),
        sourceArtifactIds: z.array(z.string()),
        imageArtifactIds: z.array(z.string()),
      })
      .strict(),
    restartReopen: z
      .object({ projectId: z.string(), reopenedAt: z.string(), exportArtifactId: z.string() })
      .strict(),
    sources: z.array(
      z
        .object({
          url: z.string(),
          role: z.enum(["official", "primary", "supporting"]),
          artifactId: z.string(),
        })
        .strict(),
    ),
    lineage: z.array(ProviderArtifactProvenanceSchema),
    imageArtifacts: z.array(ProviderArtifactProvenanceSchema),
  })
  .strict();

const BenchmarkIdSchema = z.enum([
  "korean_business",
  "market_research",
  "chart_report",
  "image_intro",
  "revision_regeneration",
]);

const BenchmarkOutputBundleSchema = z
  .object({
    path: z.string(),
    benchmarkId: BenchmarkIdSchema,
    packageArchiveSha256: z.string(),
    reportPath: z.string(),
    goldenPathReportPath: z.string(),
    exportArtifactId: z.string(),
    screenshotCount: z.number(),
    screenshotPaths: z.array(z.string()).optional(),
    sourceCount: z.number(),
    sourceArtifactIds: z.array(z.string()),
    imageArtifactCount: z.number(),
    liveImageArtifactIds: z.array(z.string()),
    regeneratedLiveImageArtifactIds: z.array(z.string()).optional(),
    liveImageTurnIds: z.array(z.string()).optional(),
    liveImageRequestIds: z.array(z.string()).optional(),
  })
  .strict();

const BenchmarkBundleSchema = z
  .object({
    reportPath: z.string(),
    packageArchiveSha256: z.string(),
    runs: z.array(
      z
        .object({
          id: BenchmarkIdSchema,
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
          source: z.enum(["live", "mock"]),
          score: z.number(),
          mockScore: z.number(),
          goldenPathCompleted: z.boolean(),
          outputBundlePath: z.string(),
          outputBundle: BenchmarkOutputBundleSchema,
        })
        .strict(),
    ),
  })
  .strict();

const PackagedRunInputSchema = z
  .object({
    capturedAt: z.string().min(1),
    packageArchiveSha256: z.string(),
    goldenPathBundle: GoldenPathBundleSchema,
    benchmarkBundle: BenchmarkBundleSchema,
  })
  .strict();

export type Df241Df242PackagedRunInput = z.infer<typeof PackagedRunInputSchema>;

export class Df241Df242PackagedEvidenceParseError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid DF-241/DF-242 packaged run input: ${issues.join("; ")}`);
    this.name = "Df241Df242PackagedEvidenceParseError";
    this.issues = issues;
  }
}

export function parseDf241Df242PackagedRunInput(value: unknown): Df241Df242PackagedRunInput {
  const parsed = PackagedRunInputSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Df241Df242PackagedEvidenceParseError(
    parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`),
  );
}

export function parseDf241Df242PackagedRunJson(raw: string): Df241Df242PackagedRunInput {
  try {
    return parseDf241Df242PackagedRunInput(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Df241Df242PackagedEvidenceParseError([error.message]);
    }
    throw error;
  }
}
