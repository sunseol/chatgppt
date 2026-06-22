#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  buildDf245FixedStringPatterns,
  normalizeDf245ScanPathMarker,
} from "./df245-package-recheck-support.mjs";

const CAPTURED_AT = "2026-06-21T23:59:57Z";
const OUTPUT_PATH = "docs/live-evidence/release/df245-package-recheck-20260622.json";
const DRY_RUN_ARCHIVE = "dist/deckforge-macos-dry-run.tgz";
const DRY_RUN_APP = "dist/deckforge-macos-dry-run/DeckForge.app";
const DMG_PATH = "release-artifacts/DeckForge_0.1.0_aarch64.dmg";
const DMG_CHECKSUM_PATH = "release-artifacts/DeckForge_0.1.0_aarch64.dmg.sha256";
const NATIVE_APP = "src-tauri/target/release/bundle/macos/DeckForge.app";
const NATIVE_BINARY = `${NATIVE_APP}/Contents/MacOS/deckforge`;
const SCAN_ROOTS = ["dist/client", "dist/server", DRY_RUN_APP, NATIVE_APP];
const LOCAL_ABSOLUTE_PATH_MARKER = normalizeDf245ScanPathMarker(process.cwd());
const FIXED_STRING_PATTERNS = buildDf245FixedStringPatterns(LOCAL_ABSOLUTE_PATH_MARKER);
const REGEX_PATTERNS = {
  longBearerToken: "Bearer\\s+[A-Za-z0-9._-]{20,}",
  assignedOpenAiApiKey: "OPENAI_API_KEY\\s*=",
  assignedCodexSession: "CODEX_SESSION\\s*=",
};

const evidence = {
  capturedAt: CAPTURED_AT,
  evidenceKind: "df245-current-package-recheck",
  status: "blocked",
  reason:
    "Current local package and DMG hashes are rechecked, but Developer ID signing, notarization, stapling, Gatekeeper acceptance, and clean-machine execution remain missing.",
  packageArchive: {
    path: DRY_RUN_ARCHIVE,
    sha256: sha256File(DRY_RUN_ARCHIVE),
    bytes: statSync(DRY_RUN_ARCHIVE).size,
    archiveMembers: tarMemberCount(DRY_RUN_ARCHIVE),
  },
  dryRunApp: {
    path: DRY_RUN_APP,
    fileCount: fileCount(DRY_RUN_APP),
    sizeKiB: Math.round(directorySize(DRY_RUN_APP) / 1024),
  },
  nativeMacos: {
    dmgPath: DMG_PATH,
    dmgSha256: sha256File(DMG_PATH),
    dmgBytes: statSync(DMG_PATH).size,
    checksumPath: DMG_CHECKSUM_PATH,
    checksumSha256: sha256File(DMG_CHECKSUM_PATH),
    checksumVerification: command("shasum", ["-a", "256", "-c", DMG_CHECKSUM_PATH]),
    appPath: NATIVE_APP,
    appBundleSizeKiB: Math.round(directorySize(NATIVE_APP) / 1024),
    binaryPath: NATIVE_BINARY,
    binarySha256: existsSync(NATIVE_BINARY) ? sha256File(NATIVE_BINARY) : null,
  },
  contentScan: scanContent(),
  signingAndTrust: {
    codesigningIdentities: command("security", ["find-identity", "-v", "-p", "codesigning"]),
    dmgCodesign: command("codesign", ["-dv", "--verbose=4", DMG_PATH]),
    appCodesignVerify: command("codesign", [
      "--verify",
      "--deep",
      "--strict",
      "--verbose=4",
      NATIVE_APP,
    ]),
    gatekeeperAssess: command("spctl", [
      "--assess",
      "--type",
      "open",
      "--context",
      "context:primary-signature",
      "--verbose=4",
      DMG_PATH,
    ]),
  },
  blockers: [
    "Developer ID Application signing identity not available",
    "notarytool credentials and accepted notarization not available",
    "stapled DMG or app not available",
    "Gatekeeper assessment rejects the unsigned DMG",
    "clean macOS account install/login/image credential/project launch/live interview evidence not recorded",
  ],
};

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${OUTPUT_PATH} ${sha256File(OUTPUT_PATH)}`);

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function command(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  return {
    command: [cmd, ...args].join(" "),
    exitCode: result.status ?? null,
    signal: result.signal,
    stdout: cleanOutput(result.stdout),
    stderr: cleanOutput(result.stderr),
  };
}

function cleanOutput(output) {
  return output
    .replaceAll(process.cwd(), ".")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, 8);
}

function tarMemberCount(path) {
  const result = spawnSync("tar", ["-tzf", path], { encoding: "utf8" });
  if (result.status !== 0) return null;
  return result.stdout.split("\n").filter(Boolean).length;
}

function fileCount(path) {
  return walkFiles(path).length;
}

function directorySize(path) {
  return walkFiles(path).reduce((total, file) => total + statSync(file).size, 0);
}

function scanContent() {
  const files = SCAN_ROOTS.filter((root) => existsSync(root)).flatMap(walkFiles);
  const fixedStringHits = Object.fromEntries(FIXED_STRING_PATTERNS.map((pattern) => [pattern, []]));
  const regexHits = Object.fromEntries(Object.keys(REGEX_PATTERNS).map((key) => [key, []]));

  for (const file of files) {
    const text = readFileSync(file).toString("utf8");
    const displayPath = relative(process.cwd(), file);
    for (const pattern of FIXED_STRING_PATTERNS) {
      if (text.includes(pattern)) fixedStringHits[pattern].push(displayPath);
    }
    for (const [key, source] of Object.entries(REGEX_PATTERNS)) {
      if (new RegExp(source).test(text)) regexHits[key].push(displayPath);
    }
  }

  return {
    roots: SCAN_ROOTS,
    localAbsolutePathMarker: LOCAL_ABSOLUTE_PATH_MARKER,
    fileCount: files.length,
    fixedStringHits,
    regexHits,
    passed:
      Object.values(fixedStringHits).every((hits) => hits.length === 0) &&
      Object.values(regexHits).every((hits) => hits.length === 0),
  };
}

function walkFiles(path) {
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  if (!stat.isDirectory()) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    walkFiles(join(path, entry.name)),
  );
}
