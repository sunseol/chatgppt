import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";

const PACKAGE_PATH = "dist/deckforge-macos-dry-run.tgz";
const TEST_PATH = "src/lib/df233-df243-live-codex-cancel-artifact.test.ts";
const DF233_EVIDENCE_PATH = "docs/live-evidence/release/df233-evidence.json";
const DF243_EVIDENCE_PATH = "docs/live-evidence/release/df243-evidence.json";
const LIVE_CODEX_CANCEL_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df243-live-codex-cancel-smoke-20260622/summary.json";
const LIVE_CODEX_QUEUE_PATH =
  "projects/df243_live_codex_cancel_smoke_20260622/live-evidence/df233-image-queue-live_codex_cancel_product_run_20260622.json";
const LIVE_CODEX_RECOVERY_PATH =
  "projects/df243_live_codex_cancel_smoke_20260622/live-evidence/df243-cancel-job-recovery-snapshot-live_codex_cancel_product_run_20260622.json";
const LIVE_CODEX_SIGNAL_PATH =
  "projects/df243_live_codex_cancel_smoke_20260622/live-evidence/df243-cancel-job-cancel-signal-live_codex_cancel_product_run_20260622.json";
const PROJECT_ID = "df243_live_codex_cancel_smoke_20260622";
const RUN_ID = "live_codex_cancel_product_run_20260622";
const LIVE_JOB_ID = "live_job_cancel_codex_1";
const PROMPT_BUNDLE_ID = "bundle_deckctx_ab62949e_slide_01";
const SHA256_HEX = /^[a-f0-9]{64}$/;

const ReleaseEvidenceSchema = z
  .object({
    ticketId: z.enum(["DF-233", "DF-243"]),
    issueNumber: z.number().int().positive(),
    status: z.literal("blocked"),
    validationKind: z.literal("blocked"),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    currentEvidence: z.array(
      z
        .object({
          path: z.string().min(1),
          sha256: z.string().regex(SHA256_HEX).optional(),
          kind: z.string().min(1),
        })
        .passthrough(),
    ),
    missingEvidence: z.array(z.string().min(1)),
  })
  .passthrough();

const LiveCodexCancelSummarySchema = z
  .object({
    evidenceKind: z.literal("df243-live-codex-cancel-product-evidence-smoke"),
    runtime: z.string().min(1),
    projectId: z.literal(PROJECT_ID),
    runId: z.literal(RUN_ID),
    cancelRequested: z.literal(true),
    queueStatus: z.literal("failed"),
    acceptedSlides: z.array(z.unknown()).length(0),
    failures: z.array(
      z
        .object({
          jobId: z.literal(LIVE_JOB_ID),
          bundleId: z.literal(PROMPT_BUNDLE_ID),
          failureKind: z.literal("cancelled"),
          attempts: z.literal(1),
        })
        .passthrough(),
    ),
    jobs: z.array(
      z
        .object({
          id: z.literal(LIVE_JOB_ID),
          status: z.literal("cancelled"),
          cancelRequested: z.literal(true),
        })
        .passthrough(),
    ),
    queueEvidencePath: z.literal(LIVE_CODEX_QUEUE_PATH),
    queueEvidenceValidation: z.object({ kind: z.literal("ready") }).passthrough(),
    recoverySnapshotPath: z.literal(LIVE_CODEX_RECOVERY_PATH),
    cancelSignalEvidencePath: z.literal(LIVE_CODEX_SIGNAL_PATH),
    artifactWrites: z.array(
      z
        .object({
          path: z.string().min(1),
          kind: z.literal("text"),
          bytes: z.number().int().positive(),
        })
        .passthrough(),
    ),
    wroteSlideImageArtifacts: z.literal(false),
    projectFolderExport: z
      .object({
        projectArtifactWriteCount: z.literal(3),
        includesQueueEvidence: z.literal(true),
        includesCancelSnapshot: z.literal(true),
        includesCancelSignal: z.literal(true),
      })
      .passthrough(),
    appServerTurns: z.array(
      z
        .object({
          threadId: z.string().min(1),
          turnId: z.string().min(1),
          durationMs: z.number().int().positive(),
          errors: z.array(z.unknown()).length(0),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const QueueEvidenceSchema = z
  .object({
    issue: z.literal("DF-233"),
    projectId: z.literal(PROJECT_ID),
    jobId: z.literal(RUN_ID),
    resultStatus: z.literal("failed"),
    slides: z.array(z.unknown()).length(0),
    storedImageArtifactPaths: z.array(z.unknown()).length(0),
    validation: z.object({ kind: z.literal("ready") }).passthrough(),
  })
  .passthrough();

const RecoveryEvidenceSchema = z
  .object({
    issue: z.literal("DF-243"),
    scenarioId: z.literal("cancel_job"),
    projectId: z.literal(PROJECT_ID),
    jobId: z.literal(RUN_ID),
    recoverySnapshotScope: z.literal("app_storage"),
    jobStatusAfterRestart: z.literal("cancelled"),
    completedArtifactIdsBefore: z.array(z.unknown()).length(0),
    completedArtifactIdsAfter: z.array(z.unknown()).length(0),
    cancelSignalEvidencePath: z.literal(LIVE_CODEX_SIGNAL_PATH),
  })
  .passthrough();

const CancelSignalEvidenceSchema = z
  .object({
    issue: z.literal("DF-243"),
    scenarioId: z.literal("cancel_job"),
    projectId: z.literal(PROJECT_ID),
    jobId: z.literal(RUN_ID),
    liveJobId: z.literal(LIVE_JOB_ID),
    cancelSignalJobId: z.literal(LIVE_JOB_ID),
    providerId: z.literal("codex"),
    capability: z.literal("imageGeneration"),
    promptBundleId: z.literal(PROMPT_BUNDLE_ID),
    slideNumber: z.literal(1),
    attempt: z.literal(1),
  })
  .passthrough();

describe("DF-233 and DF-243 live Codex cancellation artifacts", () => {
  test("keep real OAuth cancellation evidence blocked but tied to no-storage semantics", () => {
    // Given
    const packageSha256 = sha256File(PACKAGE_PATH);
    const df233 = readJson(DF233_EVIDENCE_PATH, ReleaseEvidenceSchema);
    const df243 = readJson(DF243_EVIDENCE_PATH, ReleaseEvidenceSchema);
    const summary = readJson(LIVE_CODEX_CANCEL_SUMMARY_PATH, LiveCodexCancelSummarySchema);
    const queue = readJson(summary.queueEvidencePath, QueueEvidenceSchema);
    const recovery = readJson(summary.recoverySnapshotPath, RecoveryEvidenceSchema);
    const signal = readJson(summary.cancelSignalEvidencePath, CancelSignalEvidenceSchema);

    // When
    const df233LiveRefs = [
      releaseRef(df233, LIVE_CODEX_CANCEL_SUMMARY_PATH),
      releaseRef(df233, LIVE_CODEX_QUEUE_PATH),
    ];
    const df243LiveRefs = [
      releaseRef(df243, LIVE_CODEX_CANCEL_SUMMARY_PATH),
      releaseRef(df243, LIVE_CODEX_QUEUE_PATH),
      releaseRef(df243, LIVE_CODEX_RECOVERY_PATH),
      releaseRef(df243, LIVE_CODEX_SIGNAL_PATH),
    ];

    // Then
    expect(df233.packageArchiveSha256).toBe(packageSha256);
    expect(df243.packageArchiveSha256).toBe(packageSha256);
    expect(df233.currentEvidence.some((reference) => reference.path === TEST_PATH)).toBe(true);
    expect(df243.currentEvidence.some((reference) => reference.path === TEST_PATH)).toBe(true);
    expect(summary.runtime.includes("codex app-server --stdio")).toBe(true);
    expect(summary.artifactWrites.map((write) => write.path).sort()).toEqual(
      [LIVE_CODEX_QUEUE_PATH, LIVE_CODEX_RECOVERY_PATH, LIVE_CODEX_SIGNAL_PATH].sort(),
    );
    expect(summary.appServerTurns.length > 0).toBe(true);
    expect(queue.validation.kind).toBe("ready");
    expect(recovery.cancelSignalEvidencePath).toBe(signalPath(signal));
    expect(signal.providerId).toBe("codex");
    expect([...df233LiveRefs, ...df243LiveRefs].flatMap(referenceDigestIssue)).toEqual([]);
    expect(
      df233.missingEvidence.includes(
        "packaged in-flight user cancellation evidence from a real provider job",
      ),
    ).toBe(true);
    expect(
      df243.missingEvidence.includes(
        "packaged-run cancel signal evidence JSON generated by the product writer and exported through project folder",
      ),
    ).toBe(true);
  });
});

function readJson<Schema extends z.ZodType>(path: string, schema: Schema): z.infer<Schema> {
  return schema.parse(JSON.parse(readFileSync(path, "utf8")));
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function releaseRef(
  evidence: z.infer<typeof ReleaseEvidenceSchema>,
  path: string,
): z.infer<typeof ReleaseEvidenceSchema>["currentEvidence"][number] {
  const reference = evidence.currentEvidence.find((item) => item.path === path);
  if (!reference) {
    throw new Error(`Missing release evidence reference: ${evidence.ticketId}:${path}`);
  }
  return reference;
}

function referenceDigestIssue(
  reference: z.infer<typeof ReleaseEvidenceSchema>["currentEvidence"][number],
): readonly string[] {
  if (reference.sha256 === undefined) return [`${reference.path}:missing-sha`];
  return reference.sha256 === sha256File(reference.path) ? [] : [`${reference.path}:sha-mismatch`];
}

function signalPath(signal: z.infer<typeof CancelSignalEvidenceSchema>): string {
  return `projects/${signal.projectId}/live-evidence/df243-cancel-job-cancel-signal-${signal.jobId}.json`;
}
