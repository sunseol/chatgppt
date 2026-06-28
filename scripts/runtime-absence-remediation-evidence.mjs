#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyRuntimeAbsenceRemediationEvidence } from "./runtime-absence-remediation-evidence/verify.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(
  root,
  process.env.DECKFORGE_RUNTIME_ABSENCE_REMEDIATION_OUT_DIR ??
    `.omx/artifacts/runtime-absence-remediation-${Date.now()}`,
);

const verification = await verifyRuntimeAbsenceRemediationEvidence();
await mkdir(outDir, { recursive: true });
await writeFile(
  path.join(outDir, "verification.json"),
  `${JSON.stringify(verification, null, 2)}\n`,
);
console.log(JSON.stringify({ ...verification, outDir }, null, 2));
if (!verification.ok) process.exitCode = 1;
