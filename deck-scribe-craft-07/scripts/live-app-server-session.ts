import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import {
  AppServerJsonRpcError,
  isRecord,
  type JsonObject,
  type JsonRpcNotification,
} from "./live-app-server-types.ts";

type PendingRequest = {
  readonly resolve: (value: JsonObject) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
};

type MethodWaiter = {
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
};

export class AppServerJsonRpcSession {
  private readonly pending = new Map<number, PendingRequest>();
  private readonly waiters = new Map<string, MethodWaiter[]>();
  private readonly observedNotifications: JsonRpcNotification[] = [];
  private nextId = 1;
  private stdoutLineCount = 0;
  private stderrLineCount = 0;
  private closed = false;

  private constructor(private readonly child: ChildProcessWithoutNullStreams) {
    createInterface({ input: child.stdout }).on("line", (line) => this.observeStdout(line));
    createInterface({ input: child.stderr }).on("line", () => {
      this.stderrLineCount += 1;
    });
    child.on("error", (error) => this.rejectAll(error));
    child.on("exit", (code, signal) => {
      if (this.closed) return;
      this.rejectAll(
        new AppServerJsonRpcError(
          "app_server_exited",
          `codex app-server exited before completion: code=${String(code)} signal=${String(signal)}`,
        ),
      );
    });
  }

  static spawn(): AppServerJsonRpcSession {
    return new AppServerJsonRpcSession(
      spawn("codex", ["app-server", "--stdio"], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
      }),
    );
  }

  get protocolLineCount(): number {
    return this.stdoutLineCount;
  }

  get stderrLogLineCount(): number {
    return this.stderrLineCount;
  }

  notifications(): readonly JsonRpcNotification[] {
    return [...this.observedNotifications];
  }

  request(method: string, params: JsonObject, timeoutMs: number): Promise<JsonObject> {
    const id = this.nextId;
    this.nextId += 1;
    const payload = { jsonrpc: "2.0", id, method, params };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new AppServerJsonRpcError("request_timeout", `${method} timed out.`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      this.child.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  waitForMethod(method: string, timeoutMs: number): Promise<void> {
    if (this.observedNotifications.some((notification) => notification.method === method)) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeWaiter(method, resolve);
        reject(new AppServerJsonRpcError("method_timeout", `${method} was not observed.`));
      }, timeoutMs);
      const waiter = { resolve, reject, timeout };
      this.waiters.set(method, [...(this.waiters.get(method) ?? []), waiter]);
    });
  }

  async close(): Promise<void> {
    this.closed = true;
    this.child.stdin.end();
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this.child.kill();
        resolve();
      }, 2_000);
      this.child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private observeStdout(line: string): void {
    const parsed = parseJsonLine(line);
    if (!parsed.ok) return;
    this.stdoutLineCount += 1;
    const message = parsed.value;
    const id = typeof message["id"] === "number" ? message["id"] : undefined;
    if (id !== undefined) {
      this.resolvePending(id, message);
      return;
    }
    const method = typeof message["method"] === "string" ? message["method"] : undefined;
    if (method === undefined) return;
    const notification = "params" in message ? { method, params: message["params"] } : { method };
    this.observedNotifications.push(notification);
    this.resolveWaiters(method);
  }

  private resolvePending(id: number, message: JsonObject): void {
    const pending = this.pending.get(id);
    if (pending === undefined) return;
    clearTimeout(pending.timeout);
    this.pending.delete(id);
    pending.resolve(message);
  }

  private resolveWaiters(method: string): void {
    const waiters = this.waiters.get(method) ?? [];
    this.waiters.delete(method);
    for (const waiter of waiters) {
      clearTimeout(waiter.timeout);
      waiter.resolve();
    }
  }

  private removeWaiter(method: string, resolve: () => void): void {
    const waiters = this.waiters.get(method) ?? [];
    this.waiters.set(
      method,
      waiters.filter((waiter) => waiter.resolve !== resolve),
    );
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
    for (const waiters of this.waiters.values()) {
      for (const waiter of waiters) {
        clearTimeout(waiter.timeout);
        waiter.reject(error);
      }
    }
    this.waiters.clear();
  }
}

function parseJsonLine(
  line: string,
): { readonly ok: true; readonly value: JsonObject } | { readonly ok: false } {
  try {
    const value: unknown = JSON.parse(line);
    return isRecord(value) ? { ok: true, value } : { ok: false };
  } catch (error) {
    if (error instanceof SyntaxError) return { ok: false };
    throw error;
  }
}
