import { createHash } from "node:crypto";

export type JsonRpcNotification = {
  readonly method: string;
  readonly params?: unknown;
};

export type StructuredTurnRequest = {
  readonly prompt: string;
  readonly outputSchema: unknown;
  readonly model?: string;
  readonly networkAccess?: boolean;
};

export type StructuredTurnEvidence = {
  readonly runtime: string;
  readonly threadId: string;
  readonly turnId: string;
  readonly turnCompleted: boolean;
  readonly durationMs: number;
  readonly protocolLineCount: number;
  readonly stderrLogLineCount: number;
  readonly eventMethods: readonly string[];
  readonly notifications: readonly JsonRpcNotification[];
};

export type SmokeEvidence = {
  readonly initOk: boolean;
  readonly accountType?: string | null;
  readonly threadId: string;
  readonly turnId: string;
  readonly turnCompleted: boolean;
  readonly protocolLineCount: number;
  readonly stderrLogLineCount: number;
  readonly eventMethods: readonly string[];
  readonly finalText: string;
};

export type JsonObject = Record<string, unknown>;

export class AppServerJsonRpcError extends Error {
  readonly name = "AppServerJsonRpcError";

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function digestText(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function firstStringAt(
  value: JsonObject,
  paths: readonly (readonly string[])[],
): string | undefined {
  for (const path of paths) {
    const found = stringAt(value, path);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function stringAt(value: unknown, path: readonly string[]): string | undefined {
  let current: unknown = value;
  for (const segment of path) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return typeof current === "string" ? current : undefined;
}
