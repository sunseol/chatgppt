import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { produceDf233PackagedQueueEvidence } from "./df233-packaged-queue-evidence-producer";
import {
  buildDf233PackagedQueueInputFromProductSmoke,
  parseDf233ProductSmokeSummaryJson,
} from "./df233-packaged-queue-product-smoke-ingestion";
import { parseDf233QueueEvidenceJson } from "./df233-packaged-queue-evidence-schema";

const PACKAGE_SHA = "79558b1114d295ddd80fa8068818aeb5bb6b74b4b4b0335981f057824e997163";
const SUMMARY_PATH =
  "docs/live-evidence/codex-image/df233-queue-controls-smoke-20260622/summary.json";
const SESSION_ID = "df233_product_queue_smoke_20260622";

describe("DF-233 product smoke packaged queue ingestion", () => {
  test("turns real product queue artifacts into an honestly blocked packaged candidate", () => {
    // Given
    const summary = parseDf233ProductSmokeSummaryJson(readFileSync(SUMMARY_PATH, "utf8"));

    // When
    const input = buildDf233PackagedQueueInputFromProductSmoke({
      packageArchiveSha256: PACKAGE_SHA,
      sessionId: SESSION_ID,
      summary,
      retryQueueEvidence: parseDf233QueueEvidenceJson(
        readFileSync(summary.retry.evidencePath, "utf8"),
      ),
      cancellationQueueEvidence: parseDf233QueueEvidenceJson(
        readFileSync(summary.cancellation.evidencePath, "utf8"),
      ),
      restartResumeQueueEvidence: parseDf233QueueEvidenceJson(
        readFileSync(summary.restartResume.evidencePath, "utf8"),
      ),
    });
    const evidence = produceDf233PackagedQueueEvidence(input);

    // Then
    expect(input.queueSession.appSurface).toBe("product_image_queue_smoke");
    expect(evidence.status).toBe("blocked");
    expect(evidence.retry?.jobId).toBe("retry_product_run_20260622");
    expect(evidence.cancellation?.jobId).toBe("cancel_product_run_20260622");
    expect(evidence.restartResume?.jobId).toBe("resume_product_run_20260622");
    expect(evidence.releaseBlockers).toEqual([
      "DF-233 queue session was not captured from the packaged app surface",
      "DF-233 packaged project-folder export evidence path is not committed JSON",
      "DF-233 packaged retry evidence path is not committed JSON",
      "DF-233 packaged cancellation evidence path is not committed JSON",
      "DF-233 packaged restart_resume evidence path is not committed JSON",
    ]);
  });
});
