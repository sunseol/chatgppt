import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { produceDf243InterruptionClosureEvidence } from "./df243-interruption-closure-evidence-producer";
import { parseDf243InterruptionMatrixJson } from "./df243-interruption-closure-evidence-schema";
import {
  buildDf243InterruptionClosureInputFromProductSmokes,
  buildDf243ProductSmokeInterruptionMatrixCandidate,
  parseDf243CancelProductSmokeSummaryJson,
  parseDf243ResumeGateProductSmokeSummaryJson,
} from "./df243-product-smoke-interruption-closure-ingestion";

const DEFAULT_CANCEL_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df243-cancel-product-smoke-20260622/summary.json";
const DEFAULT_RESUME_GATE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df243-resume-gate-product-smoke-20260622/summary.json";
const DEFAULT_MATRIX_OUTPUT_PATH =
  "docs/live-evidence/release/df243-product-smoke-interruption-matrix-candidate-20260622.json";
const DEFAULT_OUTPUT_PATH =
  "docs/live-evidence/release/df243-product-smoke-interruption-closure-candidate-20260622.json";
const DEFAULT_PACKAGE_SHA = "79558b1114d295ddd80fa8068818aeb5bb6b74b4b4b0335981f057824e997163";

const [
  cancelSummaryPath = DEFAULT_CANCEL_SUMMARY_PATH,
  resumeGateSummaryPath = DEFAULT_RESUME_GATE_SUMMARY_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  matrixOutputPath = DEFAULT_MATRIX_OUTPUT_PATH,
] = process.argv.slice(2);

const cancelSummary = parseDf243CancelProductSmokeSummaryJson(
  await readFile(cancelSummaryPath, "utf8"),
);
const resumeGateSummary = parseDf243ResumeGateProductSmokeSummaryJson(
  await readFile(resumeGateSummaryPath, "utf8"),
);
const options = {
  packageArchiveSha256: process.env.DF243_PACKAGE_SHA ?? DEFAULT_PACKAGE_SHA,
  matrixEvidencePath: matrixOutputPath,
  cancelSummary,
  cancelMatrix: parseDf243InterruptionMatrixJson(await readFile(cancelSummary.matrixPath, "utf8")),
  resumeGateSummary,
  resumeGateMatrix: parseDf243InterruptionMatrixJson(
    await readFile(resumeGateSummary.matrixPath, "utf8"),
  ),
};
const matrix = buildDf243ProductSmokeInterruptionMatrixCandidate(options);
const input = buildDf243InterruptionClosureInputFromProductSmokes(options);
const evidence = produceDf243InterruptionClosureEvidence(input);

await writeJson(matrixOutputPath, matrix);
await writeJson(outputPath, evidence);
console.log(`${outputPath} ${evidence.status}`);

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
