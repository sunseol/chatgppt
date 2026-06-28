#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReleaseEvidencePreflight } from "./preflight.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: bun scripts/release-evidence-bundle/verify-manifest.mjs <manifest.json>");
  process.exit(1);
}

const outDir = path.resolve(
  root,
  process.env.DECKFORGE_RELEASE_EVIDENCE_PREFLIGHT_OUT_DIR ??
    `.omx/artifacts/release-evidence-preflight-${Date.now()}`,
);
await mkdir(outDir, { recursive: true });

const verification = await writeReleaseEvidencePreflight(
  path.resolve(manifestPath),
  path.join(outDir, "verification.json"),
);
console.log(JSON.stringify({ ...verification, outDir }, null, 2));
if (!verification.ok) process.exit(1);
