import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import readline from "node:readline";

const baseUrl = process.env.DECKFORGE_QA_URL ?? "http://127.0.0.1:4173/";
const screenshotPath =
  process.env.DECKFORGE_QA_SCREENSHOT ?? "/tmp/deckforge-live-interview-real-invoke.png";
const codexBin = resolveCodexBinary();

const invokeCalls = [];
const structuredTurns = [];

class JsonRpcSession {
  #child;
  #nextId = 1;
  #waiters = [];
  #notifications = [];
  #stderr = "";
  #closed = false;

  constructor() {
    this.#child = spawn(codexBin, ["app-server"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const rl = readline.createInterface({ input: this.#child.stdout });
    rl.on("line", (line) => this.#handleLine(line));
    this.#child.stderr.on("data", (chunk) => {
      this.#stderr = `${this.#stderr}${chunk.toString()}`.slice(-5000);
    });
    this.#child.on("close", (code, signal) => {
      this.#closed = true;
      this.#rejectAll(
        new Error(
          `app-server closed before response (code=${code ?? "null"}, signal=${signal ?? "null"}): ${this.#stderr.trim()}`,
        ),
      );
    });
  }

  async request(method, params, timeoutMs = 60_000) {
    const id = this.#nextId++;
    const request = { jsonrpc: "2.0", id, method, params };
    const responsePromise = this.#waitFor((message) => message.id === id, timeoutMs, method);
    this.#child.stdin.write(`${JSON.stringify(request)}\n`);
    const response = await responsePromise;
    if (response.error) {
      throw new Error(`${method} JSON-RPC error: ${JSON.stringify(response.error)}`);
    }
    return response;
  }

  async waitForMethod(method, timeoutMs = 180_000) {
    return this.#waitFor((message) => message.method === method, timeoutMs, method);
  }

  takeNotifications() {
    return [...this.#notifications];
  }

  close() {
    if (this.#closed) return;
    this.#child.kill();
  }

  #waitFor(predicate, timeoutMs, label) {
    if (this.#closed) {
      return Promise.reject(new Error(`app-server is already closed while waiting for ${label}`));
    }
    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.#waiters = this.#waiters.filter((candidate) => candidate !== waiter);
          reject(new Error(`timed out waiting for ${label}: ${this.#stderr.trim()}`));
        }, timeoutMs),
      };
      this.#waiters.push(waiter);
    });
  }

  #handleLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      this.#rejectAll(new Error(`invalid app-server JSON line: ${line}; ${error.message}`));
      return;
    }

    if (typeof message.method === "string") {
      this.#notifications.push(message);
    }

    for (const waiter of [...this.#waiters]) {
      if (!waiter.predicate(message)) continue;
      clearTimeout(waiter.timer);
      this.#waiters = this.#waiters.filter((candidate) => candidate !== waiter);
      waiter.resolve(message);
    }
  }

  #rejectAll(error) {
    for (const waiter of this.#waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.#waiters = [];
  }
}

async function runStructuredTurn(request) {
  const startedAt = Date.now();
  const session = new JsonRpcSession();
  try {
    await session.request("initialize", {
      clientInfo: {
        name: "deckforge-live-structured-turn",
        version: "0.1.0",
      },
      capabilities: {
        experimentalApi: true,
      },
    });

    const thread = await session.request("thread/start", {
      cwd: process.cwd(),
      approvalPolicy: "never",
      sandbox: "read-only",
      model: request.model?.trim() || "gpt-5.4",
    });
    const threadId = thread.result?.thread?.id ?? thread.result?.threadId ?? thread.result?.id;
    if (!threadId) throw new Error(`thread/start returned no id: ${JSON.stringify(thread)}`);

    const turn = await session.request("turn/start", {
      threadId,
      input: [{ type: "text", text: request.prompt }],
      outputSchema: request.outputSchema,
      approvalPolicy: "never",
      sandboxPolicy: {
        type: "readOnly",
        networkAccess: request.networkAccess === true,
      },
    });
    const turnId = turn.result?.turn?.id ?? turn.result?.turnId ?? turn.result?.id;
    if (!turnId) throw new Error(`turn/start returned no id: ${JSON.stringify(turn)}`);

    await session.waitForMethod("turn/completed");
    const notifications = session.takeNotifications();
    const eventMethods = [];
    for (const notification of notifications) {
      if (!eventMethods.includes(notification.method)) eventMethods.push(notification.method);
    }
    const evidence = {
      runtime: "codex app-server",
      threadId,
      turnId,
      turnCompleted: true,
      durationMs: Date.now() - startedAt,
      eventMethods,
      notifications,
    };
    structuredTurns.push(evidence);
    return evidence;
  } finally {
    session.close();
  }
}

async function runSmoke() {
  const evidence = await runStructuredTurn({
    prompt:
      'Return only JSON: {"artifact":"deckforge_live_current_smoke","stage":"current_health","mock":false,"fixture":false,"status":"ok"}',
    outputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["artifact", "stage", "mock", "fixture", "status"],
      properties: {
        artifact: { type: "string" },
        stage: { type: "string" },
        mock: { type: "boolean" },
        fixture: { type: "boolean" },
        status: { type: "string" },
      },
    },
    networkAccess: false,
  });
  const finalText =
    evidence.notifications
      .filter((notification) => notification.method === "item/completed")
      .map((notification) => notification.params?.item?.text)
      .find((text) => typeof text === "string") ?? "";
  return {
    initOk: true,
    accountType: "chatgpt",
    threadId: evidence.threadId,
    turnId: evidence.turnId,
    turnCompleted: evidence.turnCompleted,
    eventMethods: evidence.eventMethods,
    finalText,
  };
}

async function runLoginStatus() {
  const child = spawn(codexBin, ["login", "status"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const [stdout, stderr, status] = await Promise.all([
    collectStream(child.stdout),
    collectStream(child.stderr),
    new Promise((resolve) => child.on("close", (code) => resolve({ code, success: code === 0 }))),
  ]);
  return {
    command: `${codexBin} login status`,
    exitCode: status.code,
    success: status.success,
    stdout,
    stderr,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleLines = [];
  const pageErrors = [];
  page.on("console", (message) => consoleLines.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));

  await page.exposeFunction("__deckforgeInvoke", async (command, args) => {
    invokeCalls.push({ command, args });
    if (command === "deckforge_codex_app_server_structured_turn") {
      return runStructuredTurn(args.request);
    }
    if (command === "deckforge_codex_login_status") {
      return runLoginStatus();
    }
    if (command === "deckforge_app_info") {
      return { name: "DeckForge", version: "0.0.10", desktopRuntime: "tauri-v2" };
    }
    if (command === "deckforge_codex_app_server_smoke") {
      return runSmoke();
    }
    throw new Error(`unexpected invoke command: ${command}`);
  });

  await page.addInitScript(() => {
    Object.defineProperty(window, "__TAURI__", {
      configurable: true,
      value: {
        core: {
          invoke: (command, args) => window.__deckforgeInvoke(command, args),
        },
      },
    });
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("deckforge.projects.v1"));
  await page.reload({ waitUntil: "networkidle" });

  await page.getByRole("button", { name: "새 프로젝트" }).first().click();
  await page.getByRole("button", { name: /AI 슬라이드 제작 시스템 피치덱/ }).click();
  await page.getByRole("button", { name: /프로젝트 생성/ }).click();
  await page.waitForURL(/\/project\/[^/]+\/interview/, { timeout: 10_000 });

  await page.getByRole("button", { name: "라이브 인터뷰 실행" }).click();
  try {
    await page.getByRole("button", { name: "라이브 실행 중" }).waitFor({ timeout: 10_000 });
    await page.waitForFunction(() => !document.body.innerText.includes("라이브 실행 중"), null, {
      timeout: 240_000,
    });
    await page
      .getByText(/인터뷰 질문이 준비되었습니다|라이브 인터뷰 브리프가 준비되었습니다/)
      .first()
      .waitFor({ timeout: 1_000 });
  } catch (error) {
    const failureScreenshot = screenshotPath.replace(/\.png$/, "-failed.png");
    await page.screenshot({ path: failureScreenshot, fullPage: true });
    const pageText = await compactPageText(page);
    await browser.close();
    console.log(
      JSON.stringify(
        {
          ok: false,
          baseUrl,
          codexBin,
          screenshotPath: failureScreenshot,
          error: error instanceof Error ? error.message : String(error),
          pageText,
          invokeCommands: invokeCalls.map((call) => call.command),
          structuredTurns: summarizeTurns(),
          consoleLines: consoleLines.slice(-20),
          pageErrors,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const statusText = await page
    .locator("text=/인터뷰 질문이 준비되었습니다|라이브 인터뷰 브리프가 준비되었습니다/")
    .first()
    .textContent();
  const projectCount = await page.evaluate(() => {
    const raw = localStorage.getItem("deckforge.projects.v1");
    return raw ? JSON.parse(raw).length : 0;
  });

  await browser.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        codexBin,
        screenshotPath,
        statusText,
        projectCount,
        invokeCommands: invokeCalls.map((call) => call.command),
        structuredTurns: summarizeTurns(),
        consoleLines: consoleLines.slice(-20),
        pageErrors,
      },
      null,
      2,
    ),
  );
}

async function compactPageText(page) {
  const text = await page.locator("body").innerText({ timeout: 5_000 });
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000);
}

function summarizeTurns() {
  return structuredTurns.map((turn) => ({
    threadId: turn.threadId,
    turnId: turn.turnId,
    durationMs: turn.durationMs,
    eventMethods: turn.eventMethods,
    errors: turn.notifications
      .filter((notification) => notification.method === "error")
      .map((notification) => notification.params ?? notification),
    completedItems: turn.notifications
      .filter((notification) => notification.method === "item/completed")
      .map((notification) => ({
        type: notification.params?.item?.type,
        text: notification.params?.item?.text?.slice(0, 600),
      })),
  }));
}

function collectStream(stream) {
  return new Promise((resolve) => {
    let output = "";
    stream.on("data", (chunk) => {
      output += chunk.toString();
    });
    stream.on("end", () => resolve(output));
  });
}

function resolveCodexBinary() {
  const candidates = [
    process.env.CODEX_BIN,
    path.join(homedir(), ".local/bin/codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    path.join(homedir(), ".cargo/bin/codex"),
    path.join(homedir(), ".bun/bin/codex"),
    "codex",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === "codex") return candidate;
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next known install location.
    }
  }
  throw new Error("No runnable Codex CLI binary found.");
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exit(1);
});
