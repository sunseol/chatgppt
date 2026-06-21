#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizePackageBuildDirectory } from "./package-path-sanitizer.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildOutputDirectories = [join(root, "dist", "client"), join(root, "dist", "server")];

for (const directory of buildOutputDirectories) {
  if (!existsSync(directory)) {
    throw new Error(`Missing package build output: ${directory}`);
  }
  sanitizePackageBuildDirectory(directory, root);
}
