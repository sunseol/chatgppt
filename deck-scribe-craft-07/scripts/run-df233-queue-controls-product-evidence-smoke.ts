import { mkdir } from "node:fs/promises";
import { runQueueControlProductEvidenceSmokes } from "./df233-queue-controls-product-evidence-smoke-support";
import { sha256File, writeJson } from "./live-codex-generate-export-smoke-support";

const EVIDENCE_DIR = "docs/live-evidence/codex-image/df233-queue-controls-smoke-20260622";
const CAPTURED_AT = "2026-06-22T00:30:00.000Z";

const startedAt = Date.parse(CAPTURED_AT);
await mkdir(EVIDENCE_DIR, { recursive: true });

const evidence = await runQueueControlProductEvidenceSmokes(startedAt);
const summaryPath = `${EVIDENCE_DIR}/summary.json`;
await writeJson(summaryPath, {
  capturedAt: CAPTURED_AT,
  evidenceKind: "df233-queue-controls-product-evidence-smoke",
  runtime: "product slide generation queue plus DF-233 queue evidence writer",
  retry: evidence.retry,
  cancellation: evidence.cancellation,
  restartResume: evidence.restartResume,
});

console.log(`${summaryPath} ${await sha256File(summaryPath)}`);
