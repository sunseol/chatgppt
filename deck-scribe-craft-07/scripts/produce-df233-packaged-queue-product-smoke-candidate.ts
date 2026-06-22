import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  buildDf233PackagedQueueInputFromProductSmoke,
  parseDf233ProductSmokeSummaryJson,
} from "./df233-packaged-queue-product-smoke-ingestion";
import { produceDf233PackagedQueueEvidence } from "./df233-packaged-queue-evidence-producer";
import { parseDf233QueueEvidenceJson } from "./df233-packaged-queue-evidence-schema";

const DEFAULT_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df233-queue-controls-smoke-20260622/summary.json";
const DEFAULT_OUTPUT_PATH =
  "docs/live-evidence/release/df233-product-smoke-packaged-candidate-20260622.json";
const DEFAULT_SESSION_ID = "df233_product_queue_smoke_20260622";
const DEFAULT_PACKAGE_SHA = "bdb64f343b721a435889377d6449d18d537fe27a11ac41be343c481c483688ee";

const [summaryPath = DEFAULT_SUMMARY_PATH, outputPath = DEFAULT_OUTPUT_PATH] =
  process.argv.slice(2);

const summary = parseDf233ProductSmokeSummaryJson(await readFile(summaryPath, "utf8"));
const input = buildDf233PackagedQueueInputFromProductSmoke({
  packageArchiveSha256: process.env.DF233_PACKAGE_SHA ?? DEFAULT_PACKAGE_SHA,
  sessionId: process.env.DF233_SESSION_ID ?? DEFAULT_SESSION_ID,
  summary,
  retryQueueEvidence: parseDf233QueueEvidenceJson(
    await readFile(summary.retry.evidencePath, "utf8"),
  ),
  cancellationQueueEvidence: parseDf233QueueEvidenceJson(
    await readFile(summary.cancellation.evidencePath, "utf8"),
  ),
  restartResumeQueueEvidence: parseDf233QueueEvidenceJson(
    await readFile(summary.restartResume.evidencePath, "utf8"),
  ),
});
const evidence = produceDf233PackagedQueueEvidence(input);
const payload = `${JSON.stringify(evidence, null, 2)}\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, payload);
console.log(`${outputPath} ${evidence.status}`);
