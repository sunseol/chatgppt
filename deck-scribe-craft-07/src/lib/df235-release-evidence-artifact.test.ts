import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";

const PACKAGE_PATH = "dist/deckforge-macos-dry-run.tgz";
const TEST_PATH = "src/lib/df235-release-evidence-artifact.test.ts";
const DF235_EVIDENCE_PATH = "docs/live-evidence/release/df235-evidence.json";
const LINEAGE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df235-selected-slide-regeneration-lineage-20260622.json";
const APPROVAL_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df235-review-approval-evidence-20260622.json";
const FAILURE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df235-review-failure-preservation-20260622.json";
const APPROVAL_REVIEW_PATH =
  "projects/df235_live_regeneration_lineage_20260622/live-evidence/df235-slide-regeneration-review-rev_df235_lineage_20260622.json";
const FAILURE_REVIEW_PATH =
  "projects/df235_failure_preservation_smoke_20260622/live-evidence/df235-slide-regeneration-review-rev_df235_failure_preservation_20260622.json";
const PACKAGED_REVIEW_CANDIDATE_PATH =
  "docs/live-evidence/release/df235-product-smoke-packaged-review-candidate-20260622.json";
const REGENERATED_IMAGE_PATH =
  "projects/df235_live_regeneration_lineage_20260622/slides/images/slide_003.v2.png";
const REGENERATED_IMAGE_SHA = "167127d22caf3a920d843e2a88e929bc37ca98f2f83f8b88b2e678805a64910a";
const APPROVAL_REQUEST_ID = "rev_df235_lineage_20260622";
const FAILURE_REQUEST_ID = "rev_df235_failure_preservation_20260622";
const SHA256_HEX = /^[a-f0-9]{64}$/;

const ReleaseEvidenceSchema = z
  .object({
    ticketId: z.literal("DF-235"),
    issueNumber: z.literal(149),
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

const LineageSummarySchema = z
  .object({
    evidenceProjectId: z.literal("df235_live_regeneration_lineage_20260622"),
    selectedSlideNumber: z.literal(3),
    original: z
      .object({
        artifactId: z.literal("df232_live_codex_batch_image_slide_003_v1"),
      })
      .passthrough(),
    regenerated: z
      .object({
        binaryPath: z.literal(REGENERATED_IMAGE_PATH),
        binaryHash: z.literal(`sha256:${REGENERATED_IMAGE_SHA}`),
        artifactId: z.literal("df235_live_regeneration_lineage_20260622_image_slide_003_v2"),
        inputArtifactIds: z.array(z.string().min(1)),
      })
      .passthrough(),
    candidate: z
      .object({
        requestId: z.literal(APPROVAL_REQUEST_ID),
        status: z.literal("ready"),
        version: z.literal(2),
      })
      .passthrough(),
  })
  .passthrough();

const ApprovalSummarySchema = z
  .object({
    evidenceKind: z.literal("df235-review-approval-evidence-smoke"),
    lineageSummaryPath: z.literal(LINEAGE_SUMMARY_PATH),
    lineageSummarySha256: z.string().regex(SHA256_HEX),
    reviewOutcome: z.literal("approved"),
    reviewEvidencePath: z.literal(APPROVAL_REVIEW_PATH),
    reviewEvidenceSha256: z.string().regex(SHA256_HEX),
    approvedSlide: z.object({ number: z.literal(3), version: z.literal(2) }).passthrough(),
  })
  .passthrough();

const FailureSummarySchema = z
  .object({
    evidenceKind: z.literal("df235-review-failure-preservation-smoke"),
    projectId: z.literal("df235_failure_preservation_smoke_20260622"),
    eventId: z.literal(FAILURE_REQUEST_ID),
    reviewEvidencePath: z.literal(FAILURE_REVIEW_PATH),
    reviewEvidenceSha256: z.string().regex(SHA256_HEX),
    comparison: z.null(),
    liveCandidate: z.null(),
    editConsumed: z.literal(false),
    preservedSlide: z.object({ number: z.literal(1), version: z.literal(1) }).passthrough(),
  })
  .passthrough();

const ApprovalReviewSchema = z
  .object({
    issue: z.literal("DF-235"),
    eventId: z.literal(APPROVAL_REQUEST_ID),
    event: z
      .object({
        outcome: z.literal("approved"),
        approvedSlide: z.object({ number: z.literal(3), version: z.literal(2) }).passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

const FailureReviewSchema = z
  .object({
    issue: z.literal("DF-235"),
    eventId: z.literal(FAILURE_REQUEST_ID),
    event: z
      .object({
        outcome: z.literal("preserved_after_failure"),
        preservedSlide: z.object({ status: z.literal("approved") }).passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

const PackagedReviewCandidateSchema = z
  .object({
    evidenceKind: z.literal("df235-packaged-review-evidence"),
    status: z.literal("blocked"),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    reviewSessionId: z.literal("df235_product_review_smoke_20260622"),
    approval: z
      .object({
        eventId: z.literal(APPROVAL_REQUEST_ID),
        approvedSlide: z.object({ number: z.literal(3), version: z.literal(2) }).strict(),
      })
      .passthrough(),
    failurePreservation: z
      .object({
        eventId: z.literal(FAILURE_REQUEST_ID),
        preservedSlide: z.object({ number: z.literal(1), version: z.literal(1) }).strict(),
      })
      .passthrough(),
    releaseBlockers: z.array(z.string().min(1)),
  })
  .passthrough();

describe("DF-235 release evidence artifact", () => {
  test("keeps local regeneration evidence blocked until packaged review-stage QA exists", () => {
    // Given
    const evidence = readJson(DF235_EVIDENCE_PATH, ReleaseEvidenceSchema);
    const lineage = readJson(LINEAGE_SUMMARY_PATH, LineageSummarySchema);
    const approval = readJson(APPROVAL_SUMMARY_PATH, ApprovalSummarySchema);
    const failure = readJson(FAILURE_SUMMARY_PATH, FailureSummarySchema);
    const approvalReview = readJson(approval.reviewEvidencePath, ApprovalReviewSchema);
    const failureReview = readJson(failure.reviewEvidencePath, FailureReviewSchema);
    const packagedCandidate = readJson(
      PACKAGED_REVIEW_CANDIDATE_PATH,
      PackagedReviewCandidateSchema,
    );

    // When
    const releaseRefs = [
      releaseRef(evidence, LINEAGE_SUMMARY_PATH),
      releaseRef(evidence, REGENERATED_IMAGE_PATH),
      releaseRef(evidence, APPROVAL_SUMMARY_PATH),
      releaseRef(evidence, APPROVAL_REVIEW_PATH),
      releaseRef(evidence, FAILURE_SUMMARY_PATH),
      releaseRef(evidence, FAILURE_REVIEW_PATH),
      releaseRef(evidence, PACKAGED_REVIEW_CANDIDATE_PATH),
    ];

    // Then
    expect(evidence.packageArchiveSha256).toBe(sha256File(PACKAGE_PATH));
    expect(evidence.currentEvidence.some((reference) => reference.path === TEST_PATH)).toBe(true);
    expect(
      lineage.regenerated.inputArtifactIds.includes("df232_live_codex_batch_image_slide_003_v1"),
    ).toBe(true);
    expect(approval.lineageSummarySha256).toBe(sha256File(approval.lineageSummaryPath));
    expect(approval.reviewEvidenceSha256).toBe(sha256File(approval.reviewEvidencePath));
    expect(failure.reviewEvidenceSha256).toBe(sha256File(failure.reviewEvidencePath));
    expect(approvalReview.event.outcome).toBe("approved");
    expect(failureReview.event.outcome).toBe("preserved_after_failure");
    expect(packagedCandidate.packageArchiveSha256).toBe(sha256File(PACKAGE_PATH));
    expect(packagedCandidate.releaseBlockers).toEqual([
      "DF-235 review session was not captured from the packaged app surface",
      "DF-235 packaged approval review evidence path is not a committed JSON evidence file",
      "DF-235 packaged failure-preservation review evidence path is not a committed JSON evidence file",
      "DF-235 packaged failure-preservation display evidence path is not a committed display artifact",
    ]);
    expect(releaseRefs.flatMap(referenceDigestIssue)).toEqual([]);
    expect(
      evidence.missingEvidence.includes(
        "packaged Review-stage UI run approving the lineage-valid v2 regenerated candidate",
      ),
    ).toBe(true);
    expect(
      evidence.missingEvidence.includes(
        "packaged Review-stage UI failed-regeneration run proving the approved original remains selected and exportable",
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
    throw new Error(`Missing DF-235 release evidence reference: ${path}`);
  }
  return reference;
}

function referenceDigestIssue(
  reference: z.infer<typeof ReleaseEvidenceSchema>["currentEvidence"][number],
): readonly string[] {
  if (reference.sha256 === undefined) return [`${reference.path}:missing-sha`];
  return reference.sha256 === sha256File(reference.path) ? [] : [`${reference.path}:sha-mismatch`];
}
