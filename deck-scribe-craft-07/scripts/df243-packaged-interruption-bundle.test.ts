import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { produceDf243InterruptionClosureEvidence } from "./df243-interruption-closure-evidence-producer";
import {
  parseDf243InterruptionMatrix,
  parseDf243InterruptionMatrixJson,
  type Df243InterruptionMatrix,
} from "./df243-interruption-closure-evidence-schema";
import { buildDf243PackagedInterruptionClosureInput } from "./df243-packaged-interruption-bundle";

const PACKAGE_SHA = "bdb64f343b721a435889377d6449d18d537fe27a11ac41be343c481c483688ee";
const CAPTURED_AT = "2026-06-22T04:15:00.000Z";
const EVIDENCE_DIR = "docs/live-evidence/codex-image/df243-packaged-interruption-closure-20260622";
const MATRIX_PATH = "docs/live-evidence/release/df243-packaged-interruption-matrix-20260622.json";
const LEGACY_CLOSURE_PATH = "docs/live-evidence/lane-h-20260621/df243-closure-evidence.json";
const CANCEL_MATRIX_PATH =
  "docs/live-evidence/codex-image/df243-cancel-product-smoke-20260622/df243-cancel-product-smoke-matrix.json";
const RESUME_GATE_MATRIX_PATH =
  "docs/live-evidence/codex-image/df243-resume-gate-product-smoke-20260622/df243-resume-gate-product-smoke-matrix.json";

const MatrixCarrierSchema = z.object({ matrix: z.unknown() }).passthrough();

describe("DF-243 packaged interruption bundle", () => {
  test("builds ready closure input from observed text/fetch and product writer artifacts", () => {
    // Given
    const observedMatrix = readObservedMatrix(LEGACY_CLOSURE_PATH);
    const cancelMatrix = readMatrix(CANCEL_MATRIX_PATH);
    const resumeGateMatrix = readMatrix(RESUME_GATE_MATRIX_PATH);

    // When
    const bundle = buildDf243PackagedInterruptionClosureInput({
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: PACKAGE_SHA,
      evidenceDir: EVIDENCE_DIR,
      matrixEvidencePath: MATRIX_PATH,
      observedMatrix,
      cancelMatrix,
      resumeGateMatrix,
    });
    const evidence = produceDf243InterruptionClosureEvidence(bundle.input);

    // Then
    expect(bundle.artifactMappings).toHaveLength(6);
    expect(bundle.input.matrix.scenarios.map((scenario) => scenario.id)).toEqual([
      "text_turn_shutdown",
      "fetch_shutdown",
      "image_partial_resume",
      "cancel_job",
      "interrupted_artifact_gate",
    ]);
    expect(evidence.status).toBe("ready");
    expect(evidence.result).toEqual({ kind: "ready" });
    expect(evidence.closure.requiredArtifacts.imagePartialResumeEvidencePath).toStartWith(
      `${EVIDENCE_DIR}/artifacts/projects/df243_resume_gate_smoke_20260622/`,
    );
    expect(evidence.closure.requiredArtifacts.appCancelSnapshotPath).toStartWith(
      `${EVIDENCE_DIR}/artifacts/projects/df243_cancel_product_smoke_20260622/`,
    );
  });
});

function readObservedMatrix(path: string): Df243InterruptionMatrix {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  const carrier = MatrixCarrierSchema.parse(parsed);
  return parseDf243InterruptionMatrix(carrier.matrix);
}

function readMatrix(path: string): Df243InterruptionMatrix {
  return parseDf243InterruptionMatrixJson(readFileSync(path, "utf8"));
}
