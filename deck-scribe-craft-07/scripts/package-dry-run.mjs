#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizePackageBuildDirectory } from "./package-path-sanitizer.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const clientDir = join(distDir, "client");
const serverDir = join(distDir, "server");
const outputDir = join(distDir, "deckforge-macos-dry-run");
const appDir = join(outputDir, "DeckForge.app");
const contentsDir = join(appDir, "Contents");
const macosDir = join(contentsDir, "MacOS");
const resourcesDir = join(contentsDir, "Resources");
const archivePath = join(distDir, "deckforge-macos-dry-run.tgz");

run("bun", ["run", "build"]);
requirePath(clientDir, "client build output");
requirePath(serverDir, "server build output");
sanitizePackageBuildDirectory(clientDir, root);
sanitizePackageBuildDirectory(serverDir, root);

rmSync(outputDir, { recursive: true, force: true });
rmSync(archivePath, { force: true });
mkdirSync(macosDir, { recursive: true });
mkdirSync(resourcesDir, { recursive: true });

cpSync(clientDir, join(resourcesDir, "client"), { recursive: true });
cpSync(serverDir, join(resourcesDir, "server"), { recursive: true });
writeFileSync(join(contentsDir, "Info.plist"), infoPlist(), "utf8");
writeFileSync(join(macosDir, "deckforge"), launcherScript(), { encoding: "utf8", mode: 0o755 });
writeFileSync(join(outputDir, "README.md"), dryRunReadme(), "utf8");

run("tar", ["-czf", archivePath, "-C", outputDir, "DeckForge.app", "README.md"]);

console.log(`Created unsigned dry-run app bundle: ${appDir}`);
console.log(`Created unsigned dry-run archive: ${archivePath}`);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
}

function requirePath(path, label) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
}

function infoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>DeckForge Dry Run</string>
  <key>CFBundleExecutable</key>
  <string>deckforge</string>
  <key>CFBundleIdentifier</key>
  <string>app.deckforge.internal.dryrun</string>
  <key>CFBundleName</key>
  <string>DeckForge</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.0.0-dry-run</string>
  <key>CFBundleVersion</key>
  <string>0</string>
</dict>
</plist>
`;
}

function launcherScript() {
  return `#!/bin/sh
set -eu
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
RESOURCE_DIR="$APP_DIR/Resources"

if ! command -v bun >/dev/null 2>&1; then
  echo "DeckForge dry-run package requires Bun for internal testing." >&2
  exit 78
fi

exec bun "$RESOURCE_DIR/server/server.js"
`;
}

function dryRunReadme() {
  return `# DeckForge macOS Dry-Run Package

This is an unsigned internal packaging dry run produced from the current TanStack build.

Contents:
- DeckForge.app/Contents/Resources/client
- DeckForge.app/Contents/Resources/server
- DeckForge.app/Contents/MacOS/deckforge

Limitations:
- This is not a notarized release artifact.
- This is not the final Tauri bundle; use bun run tauri:build for native packaging.
- The launcher requires Bun on the test machine.
- Code signing and notarization require Apple Developer credentials and a hardened runtime capable final app bundle.
`;
}
