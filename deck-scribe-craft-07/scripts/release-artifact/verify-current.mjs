#!/usr/bin/env bun

import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeDmgSha256Verification } from "./checksum.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const version = readFileSync(path.join(root, "release-artifacts", "BUILD_VERSION"), "utf8").trim();
const dmgPath = path.join(root, "release-artifacts", `DeckForge_${version}_aarch64.dmg`);
const outDir = path.resolve(
  root,
  process.env.DECKFORGE_RELEASE_ARTIFACT_OUT_DIR ??
    `.omx/artifacts/release-artifact-checksum-${Date.now()}`,
);
mkdirSync(outDir, { recursive: true });

const verification = writeDmgSha256Verification(dmgPath, path.join(outDir, "verification.json"));
console.log(JSON.stringify({ ...verification, outDir }, null, 2));
