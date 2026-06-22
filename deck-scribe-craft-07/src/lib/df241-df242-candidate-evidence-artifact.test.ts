import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";

const PACKAGE_PATH = "dist/deckforge-macos-dry-run.tgz";
const TEST_PATH = "src/lib/df241-df242-candidate-evidence-artifact.test.ts";
const DF241_EVIDENCE_PATH = "docs/live-evidence/release/df241-evidence.json";
const DF242_EVIDENCE_PATH = "docs/live-evidence/release/df242-evidence.json";
const CANDIDATE_PATH = "docs/live-evidence/release/df241-df242-candidate-20260622.json";
const PACKAGED_RUN_CANDIDATE_PATH =
  "docs/live-evidence/release/df241-df242-packaged-run-candidate-20260622.json";
const SHA256_HEX = /^[a-f0-9]{64}$/;

const ReleaseEvidenceSchema = z
  .object({
    ticketId: z.enum(["DF-241", "DF-242"]),
    issueNumber: z.number().int().positive(),
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

const CandidateEvidenceSchema = z
  .object({
    evidenceKind: z.literal("df241-df242-current-candidate-evidence"),
    status: z.literal("blocked"),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    goldenPath: z
      .object({
        result: z
          .object({
            kind: z.literal("blocked"),
            issues: z.array(z.object({ code: z.string().min(1) }).passthrough()),
          })
          .passthrough(),
        completedSteps: z.array(z.string().min(1)),
        sourceCount: z.literal(3),
        imageArtifactCount: z.literal(6),
        textLineageCount: z.literal(5),
        missingReleaseEvidence: z.array(z.string().min(1)),
      })
      .passthrough(),
    benchmark: z
      .object({
        result: z
          .object({
            kind: z.literal("blocked"),
            passedLiveCount: z.literal(0),
            issues: z.array(z.object({ code: z.string().min(1) }).passthrough()),
          })
          .passthrough(),
        scenarioCount: z.literal(5),
        passedLiveCount: z.literal(0),
        missingReleaseEvidence: z.array(z.string().min(1)),
      })
      .passthrough(),
    sourceArtifacts: z.array(z.object({ url: z.string().url() }).passthrough()).length(3),
    imageArtifactIds: z.array(z.string().min(1)),
  })
  .passthrough();

const PackagedRunCandidateSchema = z
  .object({
    evidenceKind: z.literal("df241-df242-packaged-run-evidence"),
    status: z.literal("blocked"),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    goldenPath: z
      .object({
        result: z.object({ kind: z.literal("blocked") }).passthrough(),
        completedSteps: z.array(z.string().min(1)),
        sourceCount: z.literal(3),
        imageArtifactCount: z.literal(6),
        textLineageCount: z.literal(5),
      })
      .passthrough(),
    benchmark: z
      .object({
        result: z
          .object({ kind: z.literal("blocked"), passedLiveCount: z.literal(0) })
          .passthrough(),
        scenarioCount: z.literal(5),
        passedLiveCount: z.literal(0),
      })
      .passthrough(),
    releaseBlockers: z.array(z.string().min(1)),
  })
  .passthrough();

describe("DF-241 and DF-242 current candidate evidence artifact", () => {
  test("keeps the assembled live candidate blocked until packaged runs exist", () => {
    // Given
    const packageSha256 = sha256File(PACKAGE_PATH);
    const df241 = readJson(DF241_EVIDENCE_PATH, ReleaseEvidenceSchema);
    const df242 = readJson(DF242_EVIDENCE_PATH, ReleaseEvidenceSchema);
    const candidate = readJson(CANDIDATE_PATH, CandidateEvidenceSchema);
    const packagedRunCandidate = readJson(PACKAGED_RUN_CANDIDATE_PATH, PackagedRunCandidateSchema);

    // When
    const goldenPathIssueCodes = candidate.goldenPath.result.issues.map((issue) => issue.code);
    const benchmarkIssueCodes = candidate.benchmark.result.issues.map((issue) => issue.code);
    const releaseRefs = [
      releaseRef(df241, CANDIDATE_PATH),
      releaseRef(df241, PACKAGED_RUN_CANDIDATE_PATH),
      releaseRef(df242, CANDIDATE_PATH),
      releaseRef(df242, PACKAGED_RUN_CANDIDATE_PATH),
    ];

    // Then
    expect(candidate.packageArchiveSha256).toBe(packageSha256);
    expect(packagedRunCandidate.packageArchiveSha256).toBe(packageSha256);
    expect(df241.packageArchiveSha256).toBe(packageSha256);
    expect(df242.packageArchiveSha256).toBe(packageSha256);
    expect(df241.currentEvidence.some((reference) => reference.path === TEST_PATH)).toBe(true);
    expect(df242.currentEvidence.some((reference) => reference.path === TEST_PATH)).toBe(true);
    expect(goldenPathIssueCodes).toEqual([
      "missing_e2e_step",
      "unsigned_live_e2e_report",
      "insufficient_step_evidence",
      "missing_validation_bundle",
      "missing_restart_reopen_evidence",
    ]);
    expect(benchmarkIssueCodes).toEqual([
      "missing_output_bundle",
      "output_bundle_report_missing",
      "live_benchmark_shortfall",
    ]);
    expect(
      candidate.imageArtifactIds.includes(
        "df235_live_regeneration_lineage_20260622_image_slide_003_v2",
      ),
    ).toBe(true);
    expect(packagedRunCandidate.releaseBlockers).toEqual([
      "DF-241 golden path evidence is blocked",
      "DF-242 benchmark evidence is blocked",
    ]);
    expect(releaseRefs.flatMap(referenceDigestIssue)).toEqual([]);
    expect(df241.missingEvidence.includes("signed live_e2e_report.md")).toBe(true);
    expect(df242.missingEvidence.includes("five distinct packaged benchmark output bundles")).toBe(
      true,
    );
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
