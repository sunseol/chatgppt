#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPowerPointRoundTripManifest } from "./powerpoint-round-trip-evidence/manifest.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const rootDir = path.resolve(root, readOption("--root-dir") ?? ".");
const outPath = path.resolve(
  root,
  readOption("--out") ?? path.join(rootDir, "powerpoint-round-trip-manifest.json"),
);

const manifest = await buildPowerPointRoundTripManifest({
  rootDir,
  sourceDmgSha256: requiredOption("--source-dmg-sha256"),
  pptxPath: requiredOption("--pptx-path"),
  roundTrippedPptxPath: requiredOption("--round-tripped-pptx-path"),
  powerPointVersion: requiredOption("--powerpoint-version"),
  openedAt: requiredOption("--opened-at"),
  editedAt: requiredOption("--edited-at"),
  savedAt: requiredOption("--saved-at"),
  editedSlideId: requiredOption("--edited-slide-id"),
  editedObjectId: requiredOption("--edited-object-id"),
  editDescription: requiredOption("--edit-description"),
  beforeObjectGraphPath: requiredOption("--before-object-graph-path"),
  afterObjectGraphPath: requiredOption("--after-object-graph-path"),
  operatorType: requiredOption("--operator-type"),
  operatorName: requiredOption("--operator-name"),
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
