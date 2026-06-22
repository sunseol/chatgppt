#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
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
const dryRunServerTemplatePath = join(root, "scripts", "templates", "deckforge-dry-run-server.mjs");

if (import.meta.main) {
  main();
}

function main() {
  run("bun", ["run", "build:package"]);
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
  copyFileSync(dryRunServerTemplatePath, join(resourcesDir, "dry-run-server.mjs"));
  writeFileSync(join(contentsDir, "Info.plist"), infoPlist(), "utf8");
  writeFileSync(join(macosDir, "deckforge"), launcherScript(), { encoding: "utf8", mode: 0o755 });
  writeFileSync(join(outputDir, "README.md"), dryRunReadme(), "utf8");

  createDeterministicTarGzipArchive({
    sourceDir: outputDir,
    archivePath,
    entries: ["DeckForge.app", "README.md"],
  });

  console.log(`Created unsigned dry-run app bundle: ${appDir}`);
  console.log(`Created unsigned dry-run archive: ${archivePath}`);
}

export function createDeterministicTarGzipArchive({ sourceDir, archivePath, entries }) {
  const archiveEntries = collectArchiveEntries(sourceDir, entries);
  const chunks = archiveEntries.map((entry) => createTarRecord(entry));
  chunks.push(Buffer.alloc(1024));
  writeFileSync(archivePath, gzipSync(Buffer.concat(chunks), { level: 9 }));
}

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

function collectArchiveEntries(sourceDir, entries) {
  const archiveEntries = [];
  for (const entry of [...entries].sort()) {
    collectArchiveEntry(sourceDir, entry, archiveEntries);
  }
  return archiveEntries;
}

function collectArchiveEntry(sourceDir, relativePath, archiveEntries) {
  const absolutePath = join(sourceDir, relativePath);
  const stat = statSync(absolutePath);
  const archivePath = toArchivePath(relativePath);

  if (stat.isDirectory()) {
    archiveEntries.push({
      absolutePath,
      archivePath: `${archivePath}/`,
      mode: 0o755,
      size: 0,
      type: "directory",
    });
    for (const child of readdirSync(absolutePath).sort()) {
      collectArchiveEntry(sourceDir, join(relativePath, child), archiveEntries);
    }
    return;
  }

  if (stat.isFile()) {
    archiveEntries.push({
      absolutePath,
      archivePath,
      mode: stat.mode & 0o777,
      size: stat.size,
      type: "file",
    });
    return;
  }

  throw new Error(`Unsupported dry-run package entry: ${absolutePath}`);
}

function createTarRecord(entry) {
  const header = Buffer.alloc(512);
  const { name, prefix } = splitTarPath(entry.archivePath);
  writeString(header, name, 0, 100);
  writeOctal(header, entry.mode, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, entry.size, 124, 12);
  writeOctal(header, 0, 136, 12);
  header.fill(0x20, 148, 156);
  writeString(header, entry.type === "directory" ? "5" : "0", 156, 1);
  writeString(header, "ustar", 257, 6);
  writeString(header, "00", 263, 2);
  writeString(header, "root", 265, 32);
  writeString(header, "root", 297, 32);
  writeString(header, prefix, 345, 155);
  writeChecksum(header);

  const content = entry.type === "file" ? readFileSync(entry.absolutePath) : Buffer.alloc(0);
  const padding = Buffer.alloc((512 - (content.length % 512)) % 512);
  return Buffer.concat([header, content, padding]);
}

function splitTarPath(archivePath) {
  if (Buffer.byteLength(archivePath) <= 100) {
    return { name: archivePath, prefix: "" };
  }

  for (
    let index = archivePath.lastIndexOf("/");
    index > 0;
    index = archivePath.lastIndexOf("/", index - 1)
  ) {
    const prefix = archivePath.slice(0, index);
    const name = archivePath.slice(index + 1);
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) {
      return { name, prefix };
    }
  }

  throw new Error(`Dry-run archive path is too long for ustar: ${archivePath}`);
}

function writeString(buffer, value, offset, length) {
  if (Buffer.byteLength(value) > length) {
    throw new Error(`Tar header value is too long: ${value}`);
  }
  buffer.write(value, offset, length, "utf8");
}

function writeOctal(buffer, value, offset, length) {
  const encoded = value.toString(8).padStart(length - 1, "0");
  if (encoded.length > length - 1) {
    throw new Error(`Tar header octal value is too large: ${value}`);
  }
  buffer.write(`${encoded}\0`, offset, length, "ascii");
}

function writeChecksum(header) {
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  const encoded = checksum.toString(8).padStart(6, "0");
  header.write(encoded, 148, 6, "ascii");
  header[154] = 0;
  header[155] = 0x20;
}

function toArchivePath(path) {
  return path.split("\\").join("/");
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

export function launcherScript() {
  return `#!/bin/sh
set -eu
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
RESOURCE_DIR="$APP_DIR/Resources"

if ! command -v bun >/dev/null 2>&1; then
  echo "DeckForge dry-run package requires Bun for internal testing." >&2
  exit 78
fi

cd "$RESOURCE_DIR"
exec bun dry-run-server.mjs
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
