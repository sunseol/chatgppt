import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";

const PACKAGE_PATH = "dist/deckforge-macos-dry-run.tgz";
const TEST_PATH = "src/lib/df244-release-evidence-artifact.test.ts";
const DF244_EVIDENCE_PATH = "docs/live-evidence/release/df244-evidence.json";
const PACKAGED_RUN_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/summary.json";
const PACKAGED_USAGE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/usage-summary.json";
const PACKAGED_CONFIRMATION_RECORD_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/artifacts/projects/df244_packaged_generate_export_smoke_20260622/usage/df244_packaged_generate_export_smoke_20260622/job_packaged_generate_export_smoke_1/image-billing-confirmation.json";
const PACKAGED_QUEUE_EVIDENCE_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/artifacts/projects/df244_packaged_generate_export_smoke_20260622/live-evidence/df233-image-queue-job_packaged_generate_export_smoke_1.json";
const PACKAGED_USAGE_CANDIDATE_PATH =
  "docs/live-evidence/release/df244-packaged-generate-export-usage-candidate-20260622.json";
const PACKAGED_IMAGE_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/artifacts/projects/df244_packaged_generate_export_smoke_20260622/slides/images/slide_001.v1.png";
const PACKAGED_PROJECT_ID = "df244_packaged_generate_export_smoke_20260622";
const PACKAGED_JOB_ID = "job_packaged_generate_export_smoke_1";
const ORIGINAL_IMAGE_PATH =
  "projects/df244_packaged_generate_export_smoke_20260622/slides/images/slide_001.v1.png";
const SHA256_HEX = /^[a-f0-9]{64}$/;

const ReleaseEvidenceSchema = z
  .object({
    ticketId: z.literal("DF-244"),
    issueNumber: z.literal(154),
    status: z.literal("ready"),
    validationKind: z.literal("ready"),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    currentEvidence: z.array(
      z
        .object({
          path: z.string().min(1),
          sha256: z.string().regex(SHA256_HEX).optional(),
        })
        .passthrough(),
    ),
    missingEvidence: z.array(z.string().min(1)).length(0),
  })
  .passthrough();

const ProductRunSummarySchema = z
  .object({
    evidenceKind: z.literal("packaged-live-codex-generate-export-smoke"),
    projectId: z.literal(PACKAGED_PROJECT_ID),
    jobId: z.literal(PACKAGED_JOB_ID),
    completedJobStatus: z.literal("succeeded"),
    slides: z.array(
      z
        .object({
          slideNumber: z.literal(1),
          status: z.literal("ready"),
          originalArtifactPath: z.literal(ORIGINAL_IMAGE_PATH),
          artifactPath: z.literal(PACKAGED_IMAGE_PATH),
        })
        .passthrough(),
    ),
    projectFolderExport: z
      .object({
        projectArtifactWriteCount: z.literal(5),
        includesOtherProjects: z.literal(false),
        leaksSyntheticSecret: z.literal(false),
      })
      .passthrough(),
    appServerTurns: z.array(
      z
        .object({
          durationMs: z.number().int().positive(),
          errors: z.array(z.unknown()).length(0),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const UsageSummarySchema = z
  .object({
    evidenceKind: z.literal("df244-product-usage-confirmation-summary"),
    projectId: z.literal(PACKAGED_PROJECT_ID),
    providerKind: z.literal("codex"),
    imageCount: z.literal(1),
    totalLatencyMs: z.number().int().positive(),
    costDisplay: z.literal("hidden_provider_did_not_supply_cost"),
    productRunSummaryPath: z.literal(PACKAGED_RUN_SUMMARY_PATH),
    userConfirmation: z.literal("confirmed_app_surface_pre_generation_codex_oauth"),
    confirmationRecordPath: z.literal(PACKAGED_CONFIRMATION_RECORD_PATH),
    confirmationLabel: z.literal("Codex image usage confirmed"),
    billingOwner: z.literal("codex_oauth_account"),
  })
  .passthrough();

const ConfirmationRecordSchema = z
  .object({
    type: z.literal("deckforge_live_image_billing_confirmation"),
    projectId: z.literal(PACKAGED_PROJECT_ID),
    jobId: z.literal(PACKAGED_JOB_ID),
    providerId: z.literal("codex"),
    evidencePath: z.string().min(1),
    label: z.literal("Codex image usage confirmed"),
    apiKeyRequired: z.literal(false),
    billingOwner: z.literal("codex_oauth_account"),
  })
  .passthrough();

const PackagedUsageCandidateSchema = z
  .object({
    evidenceKind: z.literal("df244-packaged-usage-evidence"),
    status: z.literal("ready"),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    usageValidation: z.object({ kind: z.literal("ready") }).strict(),
    stage: z
      .object({
        jobId: z.literal(PACKAGED_JOB_ID),
        providerKind: z.literal("codex"),
        usage: z.object({ imageCount: z.literal(1) }).passthrough(),
      })
      .passthrough(),
    releaseBlockers: z.array(z.string().min(1)).length(0),
  })
  .passthrough();

describe("DF-244 release evidence artifact", () => {
  test("marks usage disclosure ready from packaged same-job Codex OAuth confirmation", () => {
    // Given
    const evidence = readJson(DF244_EVIDENCE_PATH, ReleaseEvidenceSchema);
    const productRun = readJson(PACKAGED_RUN_SUMMARY_PATH, ProductRunSummarySchema);
    const usage = readJson(PACKAGED_USAGE_SUMMARY_PATH, UsageSummarySchema);
    const confirmation = readJson(PACKAGED_CONFIRMATION_RECORD_PATH, ConfirmationRecordSchema);
    const packagedCandidate = readJson(PACKAGED_USAGE_CANDIDATE_PATH, PackagedUsageCandidateSchema);

    // When
    const releaseRefs = [
      releaseRef(evidence, PACKAGED_RUN_SUMMARY_PATH),
      releaseRef(evidence, PACKAGED_USAGE_SUMMARY_PATH),
      releaseRef(evidence, PACKAGED_CONFIRMATION_RECORD_PATH),
      releaseRef(evidence, PACKAGED_QUEUE_EVIDENCE_PATH),
      releaseRef(evidence, PACKAGED_USAGE_CANDIDATE_PATH),
      releaseRef(evidence, PACKAGED_IMAGE_PATH),
    ];
    const totalLatencyMs = productRun.appServerTurns.reduce(
      (sum, turn) => sum + turn.durationMs,
      0,
    );

    // Then
    expect(evidence.packageArchiveSha256).toBe(sha256File(PACKAGE_PATH));
    expect(evidence.currentEvidence.some((reference) => reference.path === TEST_PATH)).toBe(true);
    expect(usage.confirmationRecordPath).toBe(PACKAGED_CONFIRMATION_RECORD_PATH);
    expect(usage.totalLatencyMs).toBe(totalLatencyMs);
    expect(confirmation.evidencePath).toBe(usage.confirmationEvidencePath);
    expect(confirmation.jobId).toBe(productRun.jobId);
    expect(confirmation.projectId).toBe(productRun.projectId);
    expect(confirmation.apiKeyRequired).toBe(false);
    expect(productRun.appServerTurns.length > 0).toBe(true);
    expect(packagedCandidate.packageArchiveSha256).toBe(sha256File(PACKAGE_PATH));
    expect(packagedCandidate.releaseBlockers).toEqual([]);
    expect(evidence.missingEvidence).toEqual([]);
    expect(releaseRefs.flatMap(referenceDigestIssue)).toEqual([]);
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
  if (!reference) throw new Error(`Missing DF-244 release evidence reference: ${path}`);
  return reference;
}

function referenceDigestIssue(
  reference: z.infer<typeof ReleaseEvidenceSchema>["currentEvidence"][number],
): readonly string[] {
  if (reference.sha256 === undefined) return [`${reference.path}:missing-sha`];
  return reference.sha256 === sha256File(reference.path) ? [] : [`${reference.path}:sha-mismatch`];
}
