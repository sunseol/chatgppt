#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanEvidenceSecrets } from "./evidence-secret-scan/scan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("Usage: bun scripts/evidence-secret-scan.mjs <evidence-path> [more-paths...]");
  process.exit(1);
}

const outDir = path.resolve(
  root,
  process.env.DECKFORGE_EVIDENCE_SECRET_SCAN_OUT_DIR ??
    `.omx/artifacts/evidence-secret-scan-${Date.now()}`,
);
await mkdir(outDir, { recursive: true });

const result = await scanEvidenceSecrets(targets);
const verification = { ...result, outDir };
await writeFile(
  path.join(outDir, "verification.json"),
  `${JSON.stringify(verification, null, 2)}\n`,
);
console.log(JSON.stringify(verification, null, 2));
if (!verification.ok) process.exit(1);
