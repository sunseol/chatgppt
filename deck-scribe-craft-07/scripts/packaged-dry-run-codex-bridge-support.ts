import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { StructuredTurnEvidence, StructuredTurnRequest } from "./live-app-server-types";

export type PackagedDryRunServer = {
  readonly baseUrl: string;
  readonly stdoutLines: () => readonly string[];
  readonly stderrLines: () => readonly string[];
  readonly stop: () => Promise<void>;
};

export type PackagedDryRunServerOptions = {
  readonly launcherPath?: string;
  readonly host?: string;
  readonly port?: number;
};

type PackagedBridgeFetchInit = RequestInit & {
  readonly timeout?: false;
};

type PackagedBridgeFetch = (url: string, init: PackagedBridgeFetchInit) => Promise<Response>;

export type PackagedDryRunStructuredTurnOptions = {
  readonly fetch?: PackagedBridgeFetch;
};

const DEFAULT_LAUNCHER_PATH = "dist/deckforge-macos-dry-run/DeckForge.app/Contents/MacOS/deckforge";
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4194;
const DEFAULT_STRUCTURED_TURN_TIMEOUT_MS = 300_000;
const STRUCTURED_TURN_HTTP_TIMEOUT_BUFFER_MS = 60_000;
const STRUCTURED_TURN_ENDPOINT = "/api/codex/app-server/structured-turn";

export async function startPackagedDryRunServer(
  options: PackagedDryRunServerOptions = {},
): Promise<PackagedDryRunServer> {
  const launcherPath = options.launcherPath ?? DEFAULT_LAUNCHER_PATH;
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const baseUrl = `http://${host}:${port}`;
  const child = spawn(launcherPath, [], {
    env: { ...process.env, HOST: host, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = captureOutput(child);
  try {
    await waitForServer(baseUrl);
  } catch (error) {
    await stopChild(child);
    throw error;
  }
  return {
    baseUrl,
    stdoutLines: output.stdoutLines,
    stderrLines: output.stderrLines,
    stop: () => stopChild(child),
  };
}

export async function runPackagedDryRunStructuredTurn(
  baseUrl: string,
  request: StructuredTurnRequest,
  options: PackagedDryRunStructuredTurnOptions = {},
): Promise<StructuredTurnEvidence> {
  const bridgeFetch = options.fetch ?? defaultBridgeFetch;
  const response = await bridgeFetch(`${baseUrl}${STRUCTURED_TURN_ENDPOINT}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ request }),
    signal: AbortSignal.timeout(packagedStructuredTurnHttpTimeoutMs(request)),
    timeout: false,
  });
  const body = await response.text();
  const parsed = parseJson(body);
  if (!response.ok) {
    const message =
      isRecord(parsed) && typeof parsed.message === "string"
        ? parsed.message
        : `status ${response.status}`;
    throw new Error(`Packaged dry-run Codex bridge failed: ${message}`);
  }
  return parsed as StructuredTurnEvidence;
}

export function packagedStructuredTurnHttpTimeoutMs(
  request: Pick<StructuredTurnRequest, "turnTimeoutMs">,
): number {
  return (
    (request.turnTimeoutMs ?? DEFAULT_STRUCTURED_TURN_TIMEOUT_MS) +
    STRUCTURED_TURN_HTTP_TIMEOUT_BUFFER_MS
  );
}

export function packagedEvidenceArtifactPath(evidenceDir: string, originalPath: string): string {
  if (originalPath.startsWith("/") || originalPath.split(/[\\/]+/).includes("..")) {
    throw new Error(`Unsupported packaged evidence artifact path: ${originalPath}`);
  }
  return `${evidenceDir}/artifacts/${originalPath
    .split(/[\\/]+/)
    .filter(Boolean)
    .join("/")}`;
}

export async function writePackagedEvidenceArtifact(
  evidenceDir: string,
  originalPath: string,
  content: string | Uint8Array,
): Promise<string> {
  const evidencePath = packagedEvidenceArtifactPath(evidenceDir, originalPath);
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, content);
  return evidencePath;
}

function captureOutput(child: ChildProcessWithoutNullStreams): {
  readonly stdoutLines: () => readonly string[];
  readonly stderrLines: () => readonly string[];
} {
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  return {
    stdoutLines: () => splitLines(stdout),
    stderrLines: () => splitLines(stderr),
  };
}

function defaultBridgeFetch(url: string, init: PackagedBridgeFetchInit): Promise<Response> {
  return fetch(url, init);
}

async function waitForServer(baseUrl: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await wait(250);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch (error) {
      if (attempt === 39) throw error;
    }
  }
  throw new Error(`Packaged dry-run server did not start at ${baseUrl}.`);
}

async function stopChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => child.once("exit", () => resolve())),
    wait(2_000).then(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }),
  ]);
}

function splitLines(value: string): readonly string[] {
  return value.trim().split("\n").filter(Boolean);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Packaged dry-run Codex bridge returned non-JSON: ${raw.slice(0, 120)}`);
    }
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
