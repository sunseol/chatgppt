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
    const assetProbes = await probeLocalAssets(response.body);
    const shellText = appShellText(response.body);
    return {
      capturedAt: CAPTURED_AT,
      evidenceKind: "df245-dry-run-launch-smoke",
      status:
        response.status === 200 &&
        response.bodyBytes > 1000 &&
        assetProbes.every((probe) => probe.status === 200 && probe.bodyBytes > 0) &&
        shellText.deckForge &&
        shellText.newProject &&
        shellText.localData
          ? "passed"
          : "failed",
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
      httpProbe: {
        url: response.url,
        status: response.status,
        contentType: response.contentType,
        bodyBytes: response.bodyBytes,
      },
      appShellText: shellText,
      assetProbes,
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
        body,
      };
    } catch (error) {
      if (attempt === 29) throw error;
    }
  }
  throw new Error("Dry-run server did not respond.");
}

async function probeLocalAssets(html) {
  const paths = localAssetPaths(html);
  return Promise.all(
    paths.map(async (path) => {
      const response = await fetch(`http://127.0.0.1:${PORT}${path}`);
      const body = await response.arrayBuffer();
      return {
        path,
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        bodyBytes: body.byteLength,
        sha256: sha256Buffer(Buffer.from(body)),
      };
    }),
  );
}

function localAssetPaths(html) {
  const paths = new Set();
  const patterns = [/\s(?:href|src)="(\/assets\/[^"]+)"/g, /import\("(\/assets\/[^"]+)"\)/g];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      paths.add(match[1]);
    }
  }
  return [...paths].sort();
}

function appShellText(html) {
  return {
    deckForge: html.includes("DeckForge"),
    newProject: html.includes("새 프로젝트"),
    localData: html.includes("로컬 데이터"),
    projectWorkspace: html.includes("Project Workspace"),
    loadingProjectList: html.includes("프로젝트 목록을 불러오는 중입니다."),
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sha256File(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

function sha256Buffer(value) {
  return createHash("sha256").update(value).digest("hex");
}
