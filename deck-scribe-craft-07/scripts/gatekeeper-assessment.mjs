#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyDmgSha256File } from "./release-artifact/checksum.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const explicitDmg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const dmgPath = explicitDmg ? resolve(root, explicitDmg) : defaultDmgPath();
const outDir = resolve(
  root,
  process.env.DECKFORGE_GATEKEEPER_ASSESSMENT_OUT_DIR ??
    `.omx/artifacts/gatekeeper-assessment-${Date.now()}`,
);
const mountDir = `/tmp/deckforge-gatekeeper-assessment-${process.pid}`;

if (process.platform !== "darwin") {
  throw new Error("Gatekeeper assessment requires macOS spctl/hdiutil.");
}

const verification = await assessGatekeeper();
writeVerification(verification);
console.log(JSON.stringify({ ...verification, outDir }, null, 2));
if (!verification.ok) process.exitCode = 1;

async function assessGatekeeper() {
  const verification = {
    schemaVersion: 1,
    ok: false,
    status: "blocked",
    checkedAt: new Date().toISOString(),
    dmgPath,
    checks: {},
  };
  let attachedByScript = false;
  try {
    requirePath(dmgPath, "DMG");
    const shaVerification = verifyDmgSha256File(dmgPath);
    Object.assign(verification, {
      dmgSha256: shaVerification.actualHash,
      shaPath: shaVerification.shaPath,
      sizeBytes: shaVerification.sizeBytes,
    });
    verification.checks.sha256 = {
      ok: shaVerification.ok,
      expectedHash: shaVerification.expectedHash,
      actualHash: shaVerification.actualHash,
    };
    if (!shaVerification.ok) return verification;

    const dmgAssessment = run("spctl", [
      "--assess",
      "--type",
      "open",
      "--context",
      "context:primary-signature",
      "--verbose=4",
      dmgPath,
    ]);
    verification.checks.dmgGatekeeper = commandCheck(dmgAssessment);

    rmSync(mountDir, { recursive: true, force: true });
    mkdirSync(mountDir, { recursive: true });
    run("hdiutil", ["attach", dmgPath, "-nobrowse", "-readonly", "-mountpoint", mountDir], {
      failOnError: true,
    });
    attachedByScript = true;
    const realMount = realpathSync(mountDir);
    const appPath = join(realMount, "DeckForge.app");
    requirePath(appPath, "DeckForge.app");
    verification.appPath = appPath;

    const appAssessment = run("spctl", ["--assess", "--type", "execute", "--verbose=4", appPath]);
    verification.checks.appGatekeeper = commandCheck(appAssessment);

    const signatureDetails = run("codesign", ["-dv", "--verbose=4", appPath]);
    verification.checks.signatureDetails = commandCheck(signatureDetails, { informational: true });

    verification.ok =
      verification.checks.dmgGatekeeper.ok === true &&
      verification.checks.appGatekeeper.ok === true;
    verification.status = verification.ok ? "pass" : "blocked";
    return verification;
  } catch (error) {
    verification.status = "fail";
    verification.error = error instanceof Error ? error.message : String(error);
    return verification;
  } finally {
    if (attachedByScript) run("hdiutil", ["detach", mountDir]);
    rmSync(mountDir, { recursive: true, force: true });
  }
}

function defaultDmgPath() {
  const version = readFileSync(join(root, "release-artifacts", "BUILD_VERSION"), "utf8").trim();
  return join(root, "release-artifacts", `DeckForge_${version}_aarch64.dmg`);
}

function commandCheck(result, options = {}) {
  return {
    ok: options.informational ? null : result.status === 0,
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  const normalized = {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
  if (options.failOnError && normalized.status !== 0) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed with status ${normalized.status}\n${
        normalized.stderr
      }`,
    );
  }
  return normalized;
}

function requirePath(filePath, label) {
  if (!existsSync(filePath)) throw new Error(`Missing ${label}: ${filePath}`);
}

function writeVerification(verification) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "verification.json"), `${JSON.stringify(verification, null, 2)}\n`);
}
