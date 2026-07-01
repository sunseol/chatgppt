#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyNonDeveloperUatEvidence } from "./non-developer-uat-evidence/verify.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const manifestArg = args.find((arg) => !arg.startsWith("--")) ?? null;
const outDir = path.resolve(
  root,
  process.env.DECKFORGE_NON_DEVELOPER_UAT_OUT_DIR ??
    `.omx/artifacts/non-developer-uat-${Date.now()}`,
);
const expectedDmgSha256 =
  readOption("--expected-dmg-sha256") ?? process.env.DECKFORGE_NON_DEVELOPER_UAT_DMG_SHA256 ?? null;

const manifestPath = manifestArg ? path.resolve(root, manifestArg) : null;
const verification = await verifyNonDeveloperUatEvidence(manifestPath, {
  expectedDmgSha256,
});
await mkdir(outDir, { recursive: true });
await writeFile(
  path.join(outDir, "verification.json"),
  `${JSON.stringify(verification, null, 2)}\n`,
);
console.log(JSON.stringify({ ...verification, outDir }, null, 2));
if (!verification.ok) process.exitCode = 1;

function readOption(name) {
  const prefix = `${name}=`;
  const option = args.find((arg) => arg.startsWith(prefix));
  if (option) return option.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] ?? null;
  return null;
}
