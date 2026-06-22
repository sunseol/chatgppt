#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const CAPTURED_AT = "2026-06-22T00:55:00Z";
const PORT = "4186";
const OUTPUT_PATH = "docs/live-evidence/release/df245-dry-run-launch-smoke-20260622.json";
const PACKAGE_PATH = "dist/deckforge-macos-dry-run.tgz";
const LAUNCHER_PATH = "dist/deckforge-macos-dry-run/DeckForge.app/Contents/MacOS/deckforge";

const result = await runDryRunLaunchSmoke();
await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
console.log(`${OUTPUT_PATH} ${await sha256File(OUTPUT_PATH)}`);

async function runDryRunLaunchSmoke() {
  const temporaryHome = await mkdtemp(join(tmpdir(), "deckforge-dry-run-home-"));
  const child = spawn(LAUNCHER_PATH, [], {
    env: { ...process.env, HOME: temporaryHome, PORT, HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const response = await waitForHttpResponse();
    return {
      capturedAt: CAPTURED_AT,
      evidenceKind: "df245-dry-run-launch-smoke",
      status: response.status === 200 && response.bodyBytes > 1000 ? "passed" : "failed",
      scope:
        "developer-worktree unsigned dry-run launch smoke; not clean-machine, signed, notarized, or Gatekeeper evidence",
      packageArchive: {
        path: PACKAGE_PATH,
        sha256: await sha256File(PACKAGE_PATH),
      },
      dryRunApp: {
        launcherPath: LAUNCHER_PATH,
        host: "127.0.0.1",
        port: PORT,
        temporaryHome: "created-and-removed",
      },
      httpProbe: response,
      process: {
        stdout: stdout.trim().split("\n").filter(Boolean),
        stderr: stderr.trim().split("\n").filter(Boolean),
        terminatedWith: "SIGTERM",
      },
      blockers: [
        "Developer ID signing not present",
        "notarization and stapling not present",
        "Gatekeeper acceptance not present",
        "clean macOS account execution not present",
      ],
    };
  } finally {
    child.kill("SIGTERM");
    await wait(250);
    if (!child.killed) child.kill("SIGKILL");
    await rm(temporaryHome, { recursive: true, force: true });
  }
}

async function waitForHttpResponse() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await wait(250);
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/`);
      const body = await response.text();
      return {
        url: `http://127.0.0.1:${PORT}/`,
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        bodyBytes: Buffer.byteLength(body),
      };
    } catch (error) {
      if (attempt === 29) throw error;
    }
  }
  throw new Error("Dry-run server did not respond.");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sha256File(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}
