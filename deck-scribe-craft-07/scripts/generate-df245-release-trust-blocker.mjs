#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CAPTURED_AT = "2026-06-22T01:20:00Z";
const OUTPUT_PATH =
  "docs/live-evidence/release/df245-release-trust-codesign-notarytool-stapler-spctl-20260622.json";
const PACKAGE_PATH = "dist/deckforge-macos-dry-run.tgz";
const DMG_PATH = "release-artifacts/DeckForge_0.1.0_aarch64.dmg";
const APP_PATH = "src-tauri/target/release/bundle/macos/DeckForge.app";
const APP_BINARY_PATH = `${APP_PATH}/Contents/MacOS/deckforge`;

const evidence = {
  capturedAt: CAPTURED_AT,
  evidenceKind: "df245-release-trust-blocker",
  status: "blocked",
  reason:
    "Release trust assessment was persisted, but the current macOS artifact is unsigned, not notarized, not stapled, and Gatekeeper rejects it.",
  packageArchive: {
    path: PACKAGE_PATH,
    sha256: sha256File(PACKAGE_PATH),
    bytes: statSync(PACKAGE_PATH).size,
  },
  nativeMacos: {
    dmgPath: DMG_PATH,
    dmgSha256: sha256File(DMG_PATH),
    dmgBytes: statSync(DMG_PATH).size,
    appPath: APP_PATH,
    binaryPath: APP_BINARY_PATH,
    binarySha256: sha256File(APP_BINARY_PATH),
  },
  requiredTrust: {
    signature: "developer_id",
    notarizationStatus: "accepted",
    stapled: true,
    gatekeeperAccepted: true,
  },
  observedTrust: {
    signature: "unsigned-or-adhoc",
    teamIdentifier: "not set",
    notarizationStatus: "missing",
    stapled: false,
    gatekeeperAccepted: false,
  },
  commands: {
    codesigningIdentities: command("security", ["find-identity", "-v", "-p", "codesigning"]),
    dmgCodesign: command("codesign", ["-dv", "--verbose=4", DMG_PATH]),
    appCodesignVerify: command("codesign", [
      "--verify",
      "--deep",
      "--strict",
      "--verbose=4",
      APP_PATH,
    ]),
    notarytoolHistory: command("xcrun", ["notarytool", "history"]),
    staplerValidateDmg: command("xcrun", ["stapler", "validate", DMG_PATH]),
    gatekeeperAssessDmg: command("spctl", [
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
    "Gatekeeper rejects the unsigned DMG",
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
    .slice(0, 12);
}
