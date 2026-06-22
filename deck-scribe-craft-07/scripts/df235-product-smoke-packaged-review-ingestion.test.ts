import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { parseDf235ReviewEvidenceJson } from "./df235-packaged-review-evidence-schema";
import { produceDf235PackagedReviewEvidence } from "./df235-packaged-review-evidence-producer";
import {
  buildDf235PackagedReviewInputFromProductSmokes,
  parseDf235ApprovalProductSmokeSummaryJson,
  parseDf235FailureProductSmokeSummaryJson,
} from "./df235-product-smoke-packaged-review-ingestion";

const PACKAGE_SHA = "79558b1114d295ddd80fa8068818aeb5bb6b74b4b4b0335981f057824e997163";
const SESSION_ID = "df235_product_review_smoke_20260622";
const APPROVAL_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df235-review-approval-evidence-20260622.json";
const FAILURE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df235-review-failure-preservation-20260622.json";

describe("DF-235 product smoke packaged review ingestion", () => {
  test("turns product review evidence into an honestly blocked packaged review candidate", () => {
    // Given
    const approvalSummary = parseDf235ApprovalProductSmokeSummaryJson(
      readFileSync(APPROVAL_SUMMARY_PATH, "utf8"),
    );
    const failureSummary = parseDf235FailureProductSmokeSummaryJson(
      readFileSync(FAILURE_SUMMARY_PATH, "utf8"),
    );

    // When
    const input = buildDf235PackagedReviewInputFromProductSmokes({
      packageArchiveSha256: PACKAGE_SHA,
      sessionId: SESSION_ID,
      approvalSummary,
      approvalReviewEvidence: parseDf235ReviewEvidenceJson(
        readFileSync(approvalSummary.reviewEvidencePath, "utf8"),
      ),
      failureSummary,
      failureReviewEvidence: parseDf235ReviewEvidenceJson(
        readFileSync(failureSummary.reviewEvidencePath, "utf8"),
      ),
    });
    const evidence = produceDf235PackagedReviewEvidence(input);

    // Then
    expect(input.reviewSession.appSurface).toBe("product_review_stage_smoke");
    expect(evidence.status).toBe("blocked");
    expect(evidence.approval?.eventId).toBe("rev_df235_lineage_20260622");
    expect(evidence.failurePreservation?.eventId).toBe("rev_df235_failure_preservation_20260622");
    expect(evidence.releaseBlockers).toEqual([
      "DF-235 review session was not captured from the packaged app surface",
      "DF-235 packaged approval review evidence path is not a committed JSON evidence file",
      "DF-235 packaged failure-preservation review evidence path is not a committed JSON evidence file",
      "DF-235 packaged failure-preservation display evidence path is not a committed display artifact",
    ]);
  });
});
