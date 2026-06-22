import { describe, expect, test } from "bun:test";
import {
  parseDf235PackagedReviewInput,
  produceDf235PackagedReviewEvidence,
} from "./df235-packaged-review-evidence-producer";

const PACKAGE_SHA = "79558b1114d295ddd80fa8068818aeb5bb6b74b4b4b0335981f057824e997163";
const CAPTURED_AT = "2026-06-22T05:30:00.000Z";
const SESSION_ID = "df235_packaged_review_20260622";
const APPROVAL_PROJECT_ID = "df235_packaged_review_approval_20260622";
const FAILURE_PROJECT_ID = "df235_packaged_review_failure_20260622";
const APPROVAL_EVENT_ID = "rev_df235_packaged_approval_20260622";
const FAILURE_EVENT_ID = "rev_df235_packaged_failure_20260622";

describe("DF-235 packaged review evidence producer", () => {
  test("produces ready packaged review evidence from same-run approval and failure-preservation proof", () => {
    // Given
    const input = parseDf235PackagedReviewInput(completeInput());

    // When
    const evidence = produceDf235PackagedReviewEvidence(input);

    // Then
    expect(evidence.evidenceKind).toBe("df235-packaged-review-evidence");
    expect(evidence.status).toBe("ready");
    expect(evidence.releaseBlockers).toEqual([]);
    expect(evidence.approval?.approvedSlide).toEqual({ number: 3, version: 2 });
    expect(evidence.failurePreservation?.preservedSlide).toEqual({ number: 1, version: 1 });
  });

  test("keeps packaged review evidence blocked when approval proof is missing", () => {
    // Given
    const { approvalProof: _approvalProof, ...withoutApproval } = completeInput();
    const input = parseDf235PackagedReviewInput(withoutApproval);

    // When
    const evidence = produceDf235PackagedReviewEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain("DF-235 packaged approval proof is missing");
  });

  test("keeps packaged review evidence blocked when failure-preservation proof is missing", () => {
    // Given
    const { failurePreservationProof: _failureProof, ...withoutFailure } = completeInput();
    const input = parseDf235PackagedReviewInput(withoutFailure);

    // When
    const evidence = produceDf235PackagedReviewEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain(
      "DF-235 packaged failure-preservation proof is missing",
    );
  });

  test("rejects malformed packaged review input at the boundary", () => {
    // Given
    const malformedInput = {
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
    };

    // When / Then
    expect(() => parseDf235PackagedReviewInput(malformedInput)).toThrow(
      "Invalid DF-235 packaged review input",
    );
  });
});

function completeInput() {
  return {
    capturedAt: CAPTURED_AT,
    packageArchiveSha256: PACKAGE_SHA,
    reviewSession: {
      sessionId: SESSION_ID,
      appSurface: "packaged_review_stage",
      packageArchiveSha256: PACKAGE_SHA,
    },
    approvalProof: {
      sessionId: SESSION_ID,
      evidencePath:
        "docs/live-evidence/packaged-df235-20260622/approval/df235-slide-regeneration-review.json",
      reviewEvidence: {
        schemaVersion: 1,
        issue: "DF-235",
        projectId: APPROVAL_PROJECT_ID,
        eventId: APPROVAL_EVENT_ID,
        exportedAt: 1_782_096_000_001,
        event: {
          outcome: "approved",
          candidate: {
            requestId: APPROVAL_EVENT_ID,
            slide: {
              number: 3,
              version: 2,
              status: "ready",
              imageDescriptor: "live-regeneration|background=df235_packaged_image_slide_003_v2",
            },
            originalBackgroundArtifactId: "df232_live_codex_batch_image_slide_003_v1",
            backgroundArtifactId: "df235_packaged_image_slide_003_v2",
            beforeImageDescriptor: "codex|16:9|slide_03_layout.png|slide_generation@v1",
            afterImageDescriptor: "live-regeneration|background=df235_packaged_image_slide_003_v2",
          },
          comparison: {
            slideNumber: 3,
            originalSlideVersion: 1,
            revisedSlideVersion: 2,
            requestedChanges: ["title text"],
            preservedTargets: ["source caption"],
            preservationChecks: [{ target: "source caption", status: "kept" }],
          },
          approvedSlide: {
            number: 3,
            version: 2,
            status: "approved",
            imageDescriptor: "live-regeneration|background=df235_packaged_image_slide_003_v2",
          },
        },
      },
      displayEvidence: {
        evidencePath: "docs/live-evidence/packaged-df235-20260622/approval/before-after.html",
        beforeVisible: true,
        afterVisible: true,
        approvalVisible: true,
        preservationChecksVisible: true,
      },
    },
    failurePreservationProof: {
      sessionId: SESSION_ID,
      evidencePath:
        "docs/live-evidence/packaged-df235-20260622/failure/df235-slide-regeneration-review.json",
      reviewEvidence: {
        schemaVersion: 1,
        issue: "DF-235",
        projectId: FAILURE_PROJECT_ID,
        eventId: FAILURE_EVENT_ID,
        exportedAt: 1_782_096_200_001,
        event: {
          outcome: "preserved_after_failure",
          slideNumber: 1,
          originalSlideVersion: 1,
          instruction: "오른쪽 차트를 더 크게 만들어줘.",
          issues: ["provider returned 503 from packaged DF-235 run"],
          userMessage: "Regeneration failed and the approved original was preserved.",
          preservedSlide: {
            number: 1,
            version: 1,
            status: "approved",
            imageDescriptor: "codex|16:9|slide_01_layout.png|slide_generation@v1",
          },
        },
      },
      displayEvidence: {
        evidencePath: "docs/live-evidence/packaged-df235-20260622/failure/preservation.png",
        approvedOriginalVisible: true,
        failureMessageVisible: true,
        exportableOriginalVisible: true,
      },
    },
  };
}
