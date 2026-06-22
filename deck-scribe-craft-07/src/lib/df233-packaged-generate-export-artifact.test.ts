import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";

const PACKAGE_PATH = "dist/deckforge-macos-dry-run.tgz";
const TEST_PATH = "src/lib/df233-packaged-generate-export-artifact.test.ts";
const DF233_EVIDENCE_PATH = "docs/live-evidence/release/df233-evidence.json";
const PACKAGED_RUN_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/summary.json";
const PACKAGED_PROJECT_EXPORT_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/project-folder-export.json";
const PACKAGED_QUEUE_EVIDENCE_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/artifacts/projects/df244_packaged_generate_export_smoke_20260622/live-evidence/df233-image-queue-job_packaged_generate_export_smoke_1.json";
const PACKAGED_IMAGE_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/artifacts/projects/df244_packaged_generate_export_smoke_20260622/slides/images/slide_001.v1.png";
const ORIGINAL_QUEUE_PATH =
  "projects/df244_packaged_generate_export_smoke_20260622/live-evidence/df233-image-queue-job_packaged_generate_export_smoke_1.json";
const ORIGINAL_IMAGE_PATH =
  "projects/df244_packaged_generate_export_smoke_20260622/slides/images/slide_001.v1.png";
const PACKAGED_PROJECT_ID = "df244_packaged_generate_export_smoke_20260622";
const PACKAGED_JOB_ID = "job_packaged_generate_export_smoke_1";
const SHA256_HEX = /^[a-f0-9]{64}$/;

const ReleaseEvidenceSchema = z
  .object({
    ticketId: z.literal("DF-233"),
    issueNumber: z.literal(147),
    status: z.literal("blocked"),
    validationKind: z.literal("blocked"),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    currentEvidence: z.array(
      z
        .object({
          path: z.string().min(1),
          sha256: z.string().regex(SHA256_HEX).optional(),
        })
        .passthrough(),
    ),
    missingEvidence: z.array(z.string().min(1)),
  })
  .passthrough();

const PackagedRunSummarySchema = z
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
    artifactWrites: z.array(
      z
        .object({
          originalPath: z.string().min(1),
          path: z.string().min(1),
        })
        .passthrough(),
    ),
    projectFolderExport: z
      .object({
        evidencePath: z.literal(PACKAGED_PROJECT_EXPORT_PATH),
        projectArtifactWriteCount: z.literal(5),
        includesOtherProjects: z.literal(false),
        leaksSyntheticSecret: z.literal(false),
      })
      .passthrough(),
    appServerTurns: z.array(
      z
        .object({
          threadId: z.string().min(1),
          turnId: z.string().min(1),
          errors: z.array(z.unknown()).length(0),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const QueueEvidenceSchema = z
  .object({
    issue: z.literal("DF-233"),
    projectId: z.literal(PACKAGED_PROJECT_ID),
    jobId: z.literal(PACKAGED_JOB_ID),
    resultStatus: z.literal("succeeded"),
    slides: z.array(z.object({ status: z.literal("ready") }).passthrough()).length(1),
    storedImageArtifactPaths: z.array(z.literal(ORIGINAL_IMAGE_PATH)).length(1),
    validation: z.object({ kind: z.literal("ready") }).passthrough(),
  })
  .passthrough();

describe("DF-233 packaged Generate/export queue artifact", () => {
  test("keeps packaged queue JSON and PNG evidence referenced while retry controls remain open", () => {
    // Given
    const evidence = readJson(DF233_EVIDENCE_PATH, ReleaseEvidenceSchema);
    const summary = readJson(PACKAGED_RUN_SUMMARY_PATH, PackagedRunSummarySchema);
    const queue = readJson(PACKAGED_QUEUE_EVIDENCE_PATH, QueueEvidenceSchema);

    // When
    const releaseRefs = [
      releaseRef(evidence, PACKAGED_RUN_SUMMARY_PATH),
      releaseRef(evidence, PACKAGED_PROJECT_EXPORT_PATH),
      releaseRef(evidence, PACKAGED_QUEUE_EVIDENCE_PATH),
      releaseRef(evidence, PACKAGED_IMAGE_PATH),
    ];
    const queueArtifact = summary.artifactWrites.find(
      (artifact) =>
        artifact.originalPath === ORIGINAL_QUEUE_PATH &&
        artifact.path === PACKAGED_QUEUE_EVIDENCE_PATH,
    );

    // Then
    expect(evidence.packageArchiveSha256).toBe(sha256File(PACKAGE_PATH));
    expect(evidence.currentEvidence.some((reference) => reference.path === TEST_PATH)).toBe(true);
    expect(summary.appServerTurns.length > 0).toBe(true);
    expect(queueArtifact === undefined).toBe(false);
    expect(queue.validation.kind).toBe("ready");
    expect(queue.storedImageArtifactPaths).toEqual([ORIGINAL_IMAGE_PATH]);
    expect(evidence.missingEvidence).toEqual([
      "packaged Codex OAuth image run with genuine 429 or 5xx retry provenance",
      "packaged in-flight user cancellation evidence from a real provider job",
      "packaged restart-resume evidence proving completed slides are not regenerated",
    ]);
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
  if (!reference) throw new Error(`Missing DF-233 release evidence reference: ${path}`);
  return reference;
}

function referenceDigestIssue(
  reference: z.infer<typeof ReleaseEvidenceSchema>["currentEvidence"][number],
): readonly string[] {
  if (reference.sha256 === undefined) return [`${reference.path}:missing-sha`];
  return reference.sha256 === sha256File(reference.path) ? [] : [`${reference.path}:sha-mismatch`];
}
