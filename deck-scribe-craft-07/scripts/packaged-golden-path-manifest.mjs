#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPackagedGoldenPathManifest } from "./packaged-golden-path-evidence/manifest.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const rootDir = path.resolve(root, readOption("--root-dir") ?? ".");
const outPath = path.resolve(
  root,
  readOption("--out") ?? path.join(rootDir, "packaged-golden-path.json"),
);

const manifest = await buildPackagedGoldenPathManifest({
  rootDir,
  sourceDmgSha256: requiredOption("--source-dmg-sha256"),
  projectId: requiredOption("--project-id"),
  finalExportArtifactId: requiredOption("--final-export-artifact-id"),
  signer: requiredOption("--signer"),
  signedAt: requiredOption("--signed-at"),
  reopenedAt: readOption("--reopened-at") ?? undefined,
  reportPath: readOption("--report-path") ?? undefined,
  screenshotsDir: readOption("--screenshots-dir") ?? undefined,
  recordingPath: readOption("--recording-path") ?? undefined,
  finalValidationBundlePath: readOption("--final-validation-bundle-path") ?? undefined,
  sourcesPath: readOption("--sources-path") ?? undefined,
  lineagePath: readOption("--lineage-path") ?? undefined,
  imageArtifactsPath: readOption("--image-artifacts-path") ?? undefined,
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ outPath }, null, 2));

function requiredOption(name) {
  const value = readOption(name);
  if (value) return value;
  console.error(`Missing required option: ${name}`);
  process.exit(1);
}

function readOption(name) {
  const prefix = `${name}=`;
  const option = args.find((arg) => arg.startsWith(prefix));
  if (option) return option.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] ?? null;
  return null;
}
