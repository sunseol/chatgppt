import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { produceDf243InterruptionClosureEvidence } from "./df243-interruption-closure-evidence-producer";
import {
  parseDf243InterruptionMatrix,
  parseDf243InterruptionMatrixJson,
  type Df243InterruptionMatrix,
} from "./df243-interruption-closure-evidence-schema";
import { buildDf243PackagedInterruptionClosureInput } from "./df243-packaged-interruption-bundle";

const DEFAULT_PACKAGE_SHA = "bdb64f343b721a435889377d6449d18d537fe27a11ac41be343c481c483688ee";
const DEFAULT_CAPTURED_AT = "2026-06-22T04:15:00.000Z";
const DEFAULT_EVIDENCE_DIR =
  "docs/live-evidence/codex-image/df243-packaged-interruption-closure-20260622";
const DEFAULT_OUTPUT_PATH =
  "docs/live-evidence/release/df243-packaged-interruption-closure-20260622.json";
const DEFAULT_MATRIX_OUTPUT_PATH =
  "docs/live-evidence/release/df243-packaged-interruption-matrix-20260622.json";
const DEFAULT_OBSERVED_CLOSURE_PATH =
  "docs/live-evidence/lane-h-20260621/df243-closure-evidence.json";
const DEFAULT_CANCEL_MATRIX_PATH =
  "docs/live-evidence/codex-image/df243-cancel-product-smoke-20260622/df243-cancel-product-smoke-matrix.json";
const DEFAULT_RESUME_GATE_MATRIX_PATH =
  "docs/live-evidence/codex-image/df243-resume-gate-product-smoke-20260622/df243-resume-gate-product-smoke-matrix.json";

const MatrixCarrierSchema = z.object({ matrix: z.unknown() }).passthrough();

const [
  outputPath = DEFAULT_OUTPUT_PATH,
  matrixOutputPath = DEFAULT_MATRIX_OUTPUT_PATH,
  observedClosurePath = DEFAULT_OBSERVED_CLOSURE_PATH,
  cancelMatrixPath = DEFAULT_CANCEL_MATRIX_PATH,
  resumeGateMatrixPath = DEFAULT_RESUME_GATE_MATRIX_PATH,
] = process.argv.slice(2);

const bundle = buildDf243PackagedInterruptionClosureInput({
  capturedAt: process.env.DF243_CAPTURED_AT ?? DEFAULT_CAPTURED_AT,
  packageArchiveSha256: process.env.DF243_PACKAGE_SHA ?? DEFAULT_PACKAGE_SHA,
  evidenceDir: process.env.DF243_EVIDENCE_DIR ?? DEFAULT_EVIDENCE_DIR,
  matrixEvidencePath: matrixOutputPath,
  observedMatrix: await readObservedMatrix(observedClosurePath),
  cancelMatrix: await readMatrix(cancelMatrixPath),
  resumeGateMatrix: await readMatrix(resumeGateMatrixPath),
});
const evidence = produceDf243InterruptionClosureEvidence(bundle.input);

await Promise.all(
  bundle.artifactMappings.map(async (mapping) => {
    const content = await readFile(mapping.originalPath);
    await writeFileEnsuringParent(mapping.evidencePath, content);
  }),
);
await writeJson(matrixOutputPath, bundle.input.matrix);
await writeJson(outputPath, evidence);
console.log(`${outputPath} ${evidence.status}`);

async function readObservedMatrix(path: string): Promise<Df243InterruptionMatrix> {
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  const carrier = MatrixCarrierSchema.parse(parsed);
  return parseDf243InterruptionMatrix(carrier.matrix);
}

async function readMatrix(path: string): Promise<Df243InterruptionMatrix> {
  return parseDf243InterruptionMatrixJson(await readFile(path, "utf8"));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFileEnsuringParent(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeFileEnsuringParent(path: string, content: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}
