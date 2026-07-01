#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyDmgSha256File } from "./release-artifact/checksum.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const noLaunch = args.includes("--no-launch");
const explicitDmg = args.find((arg) => !arg.startsWith("--"));
const dmgPath = explicitDmg ? resolve(root, explicitDmg) : defaultDmgPath();
const outDir = resolve(
  root,
  process.env.DECKFORGE_NATIVE_PACKAGE_QA_OUT_DIR ??
    `.omx/artifacts/native-package-qa-${Date.now()}`,
);
const mountDir = `/tmp/deckforge-native-package-qa-${process.pid}`;
const scratchDir = `/tmp/deckforge-native-package-qa-scratch-${process.pid}`;
const lastScreenshotPath = "/tmp/deckforge-native-package-qa-last.png";

if (process.platform !== "darwin") {
  throw new Error("Native package QA requires macOS hdiutil/codesign/open.");
}

await main();

async function main() {
  const evidence = {
    schemaVersion: 1,
    ok: false,
    status: "running",
    checkedAt: new Date().toISOString(),
    dmgPath,
    noLaunch,
    checks: {},
  };
  requirePath(dmgPath, "DMG");
  rmSync(mountDir, { recursive: true, force: true });
  rmSync(scratchDir, { recursive: true, force: true });
  mkdirSync(mountDir, { recursive: true });
  mkdirSync(scratchDir, { recursive: true });
  let attachedByScript = false;

  try {
    const shaVerification = verifyShaFile(dmgPath);
    Object.assign(evidence, {
      dmgSha256: shaVerification.actualHash,
      shaPath: shaVerification.shaPath,
      sizeBytes: shaVerification.sizeBytes,
    });
    evidence.checks.sha256 = {
      ok: true,
      expectedHash: shaVerification.expectedHash,
      actualHash: shaVerification.actualHash,
    };

    const existingMount = mountedPathForImage(dmgPath);
    if (!existingMount) {
      run("hdiutil", ["attach", dmgPath, "-nobrowse", "-readonly", "-mountpoint", mountDir]);
      attachedByScript = true;
    }
    const realMount = realpathSync(existingMount || mountDir);
    evidence.checks.mount = { ok: true, reusedExistingMount: Boolean(existingMount), realMount };
    const appPath = join(realMount, "DeckForge.app");
    const executablePath = join(appPath, "Contents", "MacOS", "deckforge");
    const contentsPath = join(appPath, "Contents");
    requirePath(appPath, "DeckForge.app");
    requirePath(executablePath, "DeckForge executable");
    assertApplicationsInstallShortcut(realMount);
    evidence.checks.appBundle = { ok: true, appPath, executablePath };
    evidence.checks.applicationsShortcut = { ok: true };

    run("codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath]);
    evidence.checks.codesign = { ok: true };
    run("plutil", ["-lint", join(appPath, "Contents", "Info.plist")]);
    evidence.checks.infoPlist = { ok: true };
    scanForForbiddenPackageText(contentsPath, executablePath);
    evidence.checks.contentScan = { ok: true };
    if (noLaunch) {
      evidence.checks.launchSmoke = { ok: null, skipped: true };
    } else {
      evidence.checks.launchSmoke = await launchSmoke(appPath, executablePath);
    }
    evidence.ok = true;
    evidence.status = "pass";
  } catch (error) {
    evidence.ok = false;
    evidence.status = "fail";
    evidence.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (attachedByScript) run("hdiutil", ["detach", mountDir], { allowFail: true });
    rmSync(mountDir, { recursive: true, force: true });
    rmSync(scratchDir, { recursive: true, force: true });
    writeNativePackageQaEvidence(evidence);
  }

  console.log(`Native package QA passed: ${dmgPath}`);
  console.log(`Native package QA evidence: ${join(outDir, "verification.json")}`);
}

function assertApplicationsInstallShortcut(mountPath) {
  const shortcutPath = join(mountPath, "Applications");
  requirePath(shortcutPath, "Applications install shortcut");
  const shortcutStat = lstatSync(shortcutPath);
  if (!shortcutStat.isSymbolicLink()) {
    throw new Error("DMG must include an Applications install shortcut, not a plain folder.");
  }
  const shortcutTarget = readlinkSync(shortcutPath);
  if (shortcutTarget !== "/Applications") {
    throw new Error(
      `Applications install shortcut must point to /Applications, got ${shortcutTarget}`,
    );
  }
}

function defaultDmgPath() {
  const version = readFileSync(join(root, "release-artifacts", "BUILD_VERSION"), "utf8").trim();
  return join(root, "release-artifacts", `DeckForge_${version}_aarch64.dmg`);
}

function verifyShaFile(path) {
  requirePath(`${path}.sha256`, "DMG SHA-256 file");
  const verification = verifyDmgSha256File(path);
  if (!verification.ok) {
    throw new Error(
      `DMG SHA-256 mismatch: expected ${verification.expectedHash}, got ${verification.actualHash}`,
    );
  }
  return verification;
}

function scanForForbiddenPackageText(contentsPath, executablePath) {
  const textForbidden =
    "/Users/jake|chatgppt|deck-scribe-craft-07|localhost:8080|\\.omx|\\.playwright-mcp|OPENAI_API_KEY\\s*=|sk-[A-Za-z0-9]{20,}|Bearer\\s+[A-Za-z0-9._-]{20,}";
  const binaryForbidden =
    "/Users/jake|chatgppt|deck-scribe-craft-07|\\.omx|\\.playwright-mcp|OPENAI_API_KEY\\s*=|sk-[A-Za-z0-9]{20,}|Bearer\\s+[A-Za-z0-9._-]{20,}";
  const textScan = run("rg", ["-n", "--hidden", "--no-ignore", textForbidden, contentsPath], {
    allowFail: true,
    capture: true,
  });
  if (textScan.status === 0) throw new Error(`Forbidden package text found:\n${textScan.stdout}`);
  if (textScan.status > 1) throw new Error(textScan.stderr || "Package text scan failed.");

  const binaryText = run("strings", [executablePath], { capture: true }).stdout;
  const binaryHits = binaryText
    .split("\n")
    .filter((line) => new RegExp(binaryForbidden).test(line))
    .slice(0, 20);
  if (binaryHits.length > 0) {
    throw new Error(`Forbidden executable text found:\n${binaryHits.join("\n")}`);
  }
}

function mountedPathForImage(path) {
  const target = realpathSync(path);
  for (const block of run("hdiutil", ["info"], { capture: true }).stdout.split(
    "================================================",
  )) {
    const lines = block.split("\n");
    const imageLine = lines.find((line) => line.trim().startsWith("image-path"));
    if (!imageLine) continue;
    const imagePath = imageLine.split(":").slice(1).join(":").trim();
    if (!imagePath || !existsSync(imagePath) || realpathSync(imagePath) !== target) continue;
    const mountLine = [...lines].reverse().find((line) => /\t\/.+/.test(line));
    if (!mountLine) return null;
    return mountLine.trim().split(/\t+/).at(-1) || null;
  }
  return null;
}

async function launchSmoke(appPath, executablePath) {
  const beforePids = new Set(matchingProcessIds(executablePath));
  let result;
  run("open", ["-n", appPath]);
  try {
    const pid = await waitForNewProcessId(executablePath, beforePids, 10_000);
    const windowId = await waitForWindowId(pid, 10_000);
    result = await waitForRenderedWindow(windowId, 10_000);
    return {
      ok: true,
      skipped: false,
      pid,
      windowId,
      ...result,
    };
  } finally {
    run("osascript", ["-e", 'tell application "DeckForge" to quit'], { allowFail: true });
    await sleep(1500);
    for (const pid of matchingProcessIds(executablePath)) {
      process.kill(pid, "SIGTERM");
    }
  }
  return result;
}

async function waitForRenderedWindow(windowId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    const screenshotPath = join(scratchDir, `deckforge-window-${Date.now()}.png`);
    run("screencapture", ["-x", "-l", String(windowId), screenshotPath]);
    copyFileSync(screenshotPath, lastScreenshotPath);
    try {
      const stats = assertRenderedWindow(screenshotPath);
      const evidenceScreenshotPath = join(outDir, "launch-smoke.png");
      mkdirSync(outDir, { recursive: true });
      copyFileSync(screenshotPath, evidenceScreenshotPath);
      return {
        screenshotPath: evidenceScreenshotPath,
        screenshotSha256: fileSha256(evidenceScreenshotPath),
        renderStats: stats,
      };
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  throw lastError ?? new Error("DeckForge launch smoke failed: rendered window never appeared.");
}

async function waitForNewProcessId(executablePath, beforePids, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const nextPid = matchingProcessIds(executablePath).find((pid) => !beforePids.has(pid));
    if (nextPid) return nextPid;
    await sleep(500);
  }
  throw new Error("DeckForge launch smoke failed: no new app process found.");
}

async function waitForWindowId(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const windows = listWindowsForPid(pid);
    const mainWindow = windows.find((window) => window.width >= 800 && window.height >= 600);
    if (mainWindow && Number.isInteger(mainWindow.id)) return mainWindow.id;
    await sleep(500);
  }
  throw new Error(`DeckForge launch smoke failed: no rendered app window for pid ${pid}.`);
}

function matchingProcessIds(executablePath) {
  const output = run("ps", ["-axo", "pid,args"], { capture: true }).stdout;
  return output
    .split("\n")
    .filter((line) => line.includes(executablePath))
    .map((line) => Number(line.trim().split(/\s+/, 1)[0]))
    .filter((pid) => Number.isFinite(pid) && pid > 0);
}

function listWindowsForPid(pid) {
  const script = `
import Quartz, json, sys
pid = int(sys.argv[1])
windows = Quartz.CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionOnScreenOnly, Quartz.kCGNullWindowID)
matches = []
for window in windows:
    if window.get("kCGWindowOwnerPID") != pid:
        continue
    bounds = window.get("kCGWindowBounds", {})
    window_id = window.get("kCGWindowNumber")
    if not isinstance(window_id, int):
        continue
    matches.append({
        "id": window_id,
        "width": int(bounds.get("Width", 0)),
        "height": int(bounds.get("Height", 0)),
    })
print(json.dumps(matches))
`;
  const result = run("python3", ["-c", script, String(pid)], { capture: true });
  return JSON.parse(result.stdout);
}

function assertRenderedWindow(screenshotPath) {
  const bmpPath = `${screenshotPath}.bmp`;
  run("sips", ["-s", "format", "bmp", screenshotPath, "--out", bmpPath], { capture: true });
  const stats = readBmpStats(bmpPath);
  console.log(
    `DeckForge render stats: averageLuminance=${stats.averageLuminance.toFixed(
      1,
    )}, lightRatio=${stats.lightRatio.toFixed(3)}, darkRatio=${stats.darkRatio.toFixed(3)}`,
  );
  if (
    !Number.isFinite(stats.averageLuminance) ||
    !Number.isFinite(stats.lightRatio) ||
    stats.pixelCount <= 0 ||
    stats.averageLuminance < 80 ||
    stats.lightRatio < 0.15 ||
    stats.darkRatio > 0.85
  ) {
    throw new Error(
      `DeckForge rendered a blank/dark window: averageLuminance=${stats.averageLuminance.toFixed(
        1,
      )}, lightRatio=${stats.lightRatio.toFixed(3)}, darkRatio=${stats.darkRatio.toFixed(
        3,
      )}, pixels=${stats.pixelCount}, screenshot=${screenshotPath}, lastScreenshot=${lastScreenshotPath}`,
    );
  }
  return stats;
}

function readBmpStats(path) {
  const data = readFileSync(path);
  if (data.toString("ascii", 0, 2) !== "BM") throw new Error(`Invalid BMP: ${path}`);
  const pixelOffset = data.readUInt32LE(10);
  const width = data.readInt32LE(18);
  const rawHeight = data.readInt32LE(22);
  const height = Math.abs(rawHeight);
  const bitsPerPixel = data.readUInt16LE(28);
  if (bitsPerPixel !== 24 && bitsPerPixel !== 32) {
    throw new Error(`Unsupported BMP depth ${bitsPerPixel} for ${path}`);
  }
  const bytesPerPixel = bitsPerPixel / 8;
  const rowStride = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
  let luminanceTotal = 0;
  let lightPixels = 0;
  let darkPixels = 0;
  let pixels = 0;
  for (let y = 0; y < height; y += 1) {
    const sourceY = rawHeight > 0 ? height - 1 - y : y;
    const rowOffset = pixelOffset + sourceY * rowStride;
    for (let x = 0; x < width; x += 1) {
      const pixelOffsetAt = rowOffset + x * bytesPerPixel;
      const blue = data[pixelOffsetAt] ?? 0;
      const green = data[pixelOffsetAt + 1] ?? 0;
      const red = data[pixelOffsetAt + 2] ?? 0;
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      luminanceTotal += luminance;
      if (luminance > 180) lightPixels += 1;
      if (luminance < 40) darkPixels += 1;
      pixels += 1;
    }
  }
  return {
    averageLuminance: luminanceTotal / pixels,
    lightRatio: lightPixels / pixels,
    darkRatio: darkPixels / pixels,
    pixelCount: pixels,
  };
}

function requirePath(path, label) {
  if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.status !== 0 && !options.allowFail) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed with status ${result.status}\n${
        result.stderr || ""
      }`,
    );
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function writeNativePackageQaEvidence(evidence) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "verification.json"), `${JSON.stringify(evidence, null, 2)}\n`);
}

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}
