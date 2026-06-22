import { describe, expect, test } from "bun:test";
import {
  parseDf233PackagedQueueInput,
  produceDf233PackagedQueueEvidence,
} from "./df233-packaged-queue-evidence-producer";

const PACKAGE_SHA = "79558b1114d295ddd80fa8068818aeb5bb6b74b4b4b0335981f057824e997163";
const CAPTURED_AT = "2026-06-22T06:15:00.000Z";
const SESSION_ID = "df233_packaged_queue_20260622";

describe("DF-233 packaged queue evidence producer", () => {
  test("produces ready packaged queue evidence from retry, cancel, and restart-resume proofs", () => {
    // Given
    const input = parseDf233PackagedQueueInput(completeInput());

    // When
    const evidence = produceDf233PackagedQueueEvidence(input);

    // Then
    expect(evidence.evidenceKind).toBe("df233-packaged-queue-evidence");
    expect(evidence.status).toBe("ready");
    expect(evidence.releaseBlockers).toEqual([]);
    expect(evidence.retry?.jobId).toBe("retry_packaged_run_20260622");
    expect(evidence.cancellation?.jobId).toBe("cancel_packaged_run_20260622");
    expect(evidence.restartResume?.jobId).toBe("resume_packaged_run_20260622");
  });

  test("keeps packaged queue evidence blocked when retry proof is missing", () => {
    // Given
    const { retryProof: _retryProof, ...withoutRetry } = completeInput();
    const input = parseDf233PackagedQueueInput(withoutRetry);

    // When
    const evidence = produceDf233PackagedQueueEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain("DF-233 packaged retry proof is missing");
  });

  test("keeps packaged queue evidence blocked when cancellation validation is blocked", () => {
    // Given
    const input = parseDf233PackagedQueueInput({
      ...completeInput(),
      cancellationProof: {
        ...completeInput().cancellationProof,
        queueEvidence: {
          ...completeInput().cancellationProof.queueEvidence,
          validation: {
            kind: "blocked",
            issues: [{ code: "cancel_failure_without_cancel_signal", message: "missing signal" }],
          },
        },
      },
    });

    // When
    const evidence = produceDf233PackagedQueueEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain("DF-233 packaged cancellation proof is blocked");
  });

  test("rejects malformed packaged queue input at the boundary", () => {
    // Given
    const malformedInput = {
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
    };

    // When / Then
    expect(() => parseDf233PackagedQueueInput(malformedInput)).toThrow(
      "Invalid DF-233 packaged queue input",
    );
  });
});

function completeInput() {
  return {
    capturedAt: CAPTURED_AT,
    packageArchiveSha256: PACKAGE_SHA,
    queueSession: {
      sessionId: SESSION_ID,
      appSurface: "packaged_image_queue",
      packageArchiveSha256: PACKAGE_SHA,
    },
    projectFolderExport: {
      evidencePath: "docs/live-evidence/packaged-df233-20260622/project-folder-export.json",
      projectArtifactWriteCount: 8,
      includesRetryEvidence: true,
      includesCancellationEvidence: true,
      includesRestartResumeEvidence: true,
      includesOtherProjects: false,
      leaksSyntheticSecret: false,
    },
    retryProof: {
      sessionId: SESSION_ID,
      scenario: "retry",
      evidencePath: "docs/live-evidence/packaged-df233-20260622/retry/df233-image-queue.json",
      queueEvidence: retryEvidence(),
    },
    cancellationProof: {
      sessionId: SESSION_ID,
      scenario: "cancellation",
      evidencePath: "docs/live-evidence/packaged-df233-20260622/cancel/df233-image-queue.json",
      queueEvidence: cancellationEvidence(),
    },
    restartResumeProof: {
      sessionId: SESSION_ID,
      scenario: "restart_resume",
      evidencePath: "docs/live-evidence/packaged-df233-20260622/resume/df233-image-queue.json",
      queueEvidence: restartResumeEvidence(),
    },
  };
}

function retryEvidence() {
  return {
    schemaVersion: 1,
    issue: "DF-233",
    projectId: "df233_packaged_retry_20260622",
    jobId: "retry_packaged_run_20260622",
    exportedAt: 1_782_099_000_001,
    resultStatus: "succeeded",
    slides: [readySlide(1, 3, "df233_packaged_retry_20260622")],
    failures: [],
    jobs: [
      {
        id: "live_job_retry_packaged_1",
        providerId: "codex",
        capability: "imageGeneration",
        status: "succeeded",
        attempt: 3,
        cancelRequested: false,
      },
    ],
    retryProvenance: [
      { jobId: "live_job_retry_packaged_1", slideNumber: 1, attempt: 1, failureKind: "server" },
      { jobId: "live_job_retry_packaged_1", slideNumber: 1, attempt: 2, failureKind: "server" },
    ],
    storedImageArtifactPaths: [
      "projects/df233_packaged_retry_20260622/slides/images/slide_001.v3.png",
    ],
    validation: { kind: "ready" },
  };
}

function cancellationEvidence() {
  return {
    schemaVersion: 1,
    issue: "DF-233",
    projectId: "df233_packaged_cancel_20260622",
    jobId: "cancel_packaged_run_20260622",
    exportedAt: 1_782_099_100_001,
    resultStatus: "failed",
    slides: [],
    failures: [{ jobId: "live_job_cancel_packaged_1", failureKind: "cancelled" }],
    jobs: [
      {
        id: "live_job_cancel_packaged_1",
        providerId: "codex",
        capability: "imageGeneration",
        status: "cancelled",
        attempt: 1,
        cancelRequested: true,
      },
    ],
    retryProvenance: [],
    storedImageArtifactPaths: [],
    validation: { kind: "ready" },
  };
}

function restartResumeEvidence() {
  return {
    schemaVersion: 1,
    issue: "DF-233",
    projectId: "df233_packaged_resume_20260622",
    jobId: "resume_packaged_run_20260622",
    exportedAt: 1_782_099_200_001,
    resultStatus: "succeeded",
    slides: [
      readySlide(1, 1, "df233_packaged_resume_20260622"),
      readySlide(2, 1, "df233_packaged_resume_20260622"),
    ],
    failures: [],
    jobs: [
      {
        id: "live_job_resume_packaged_1",
        providerId: "codex",
        capability: "imageGeneration",
        status: "succeeded",
        attempt: 1,
        cancelRequested: false,
      },
    ],
    retryProvenance: [],
    storedImageArtifactPaths: [
      "projects/df233_packaged_resume_20260622/slides/images/slide_001.v1.png",
      "projects/df233_packaged_resume_20260622/slides/images/slide_002.v1.png",
    ],
    restartResumeEvidence: {
      recoverySnapshotPath:
        "projects/df233_packaged_resume_20260622/live-evidence/df243-image-partial-resume-recovery-snapshot-resume_packaged_run_20260622.json",
      liveJobId: "live_job_resume_packaged_1",
      completedArtifactIdsBefore: ["df233_packaged_resume_20260622_image_slide_001_v1"],
      completedArtifactIdsAfter: [
        "df233_packaged_resume_20260622_image_slide_001_v1",
        "df233_packaged_resume_20260622_image_slide_002_v1",
      ],
      pendingImageArtifactIds: ["df233_packaged_resume_20260622_image_slide_002_v1"],
      resumedArtifactIds: ["df233_packaged_resume_20260622_image_slide_002_v1"],
    },
    validation: { kind: "ready" },
  };
}

function readySlide(slideNumber: number, version: number, projectId: string) {
  return {
    number: slideNumber,
    version,
    status: "ready",
    imageDescriptor: `codex|16:9|slide_${String(slideNumber).padStart(2, "0")}_layout.png`,
    notes: `projects/${projectId}/slides/images/slide_${String(slideNumber).padStart(
      3,
      "0",
    )}.v${version}.png`,
  };
}
