import { describe, expect, test } from "bun:test";
import {
  getDesktopAppServerBridgeStatus,
  runDesktopCodexAppServerSmoke,
  runDesktopCodexAppServerStructuredTurn,
  type DeckforgeDryRunCodexBridge,
  type DeckforgeTauriRuntime,
} from "./desktop-app-server-bridge";

describe("desktop app server bridge", () => {
  test("reports missing when the Tauri invoke bridge is absent", async () => {
    // Given
    const runtime: DeckforgeTauriRuntime = {};

    // When
    const status = getDesktopAppServerBridgeStatus(runtime);
    const result = await runDesktopCodexAppServerSmoke(runtime);

    // Then
    expect(status).toBe("missing");
    expect(result.kind).toBe("missing_bridge");
  });

  test("uses the packaged dry-run bridge when the Tauri invoke bridge is absent", async () => {
    // Given
    const originalFetch = globalThis.fetch;
    const runtime: DeckforgeTauriRuntime = {};
    const dryRunBridge: DeckforgeDryRunCodexBridge = {
      enabled: true,
      smokeEndpoint: "http://127.0.0.1/api/codex/app-server/smoke",
      structuredTurnEndpoint: "http://127.0.0.1/api/codex/app-server/structured-turn",
    };
    let capturedUrl = "";

    globalThis.fetch = (async (input, init) => {
      capturedUrl = String(input);
      expect(init?.method).toBe("POST");
      return new Response(
        JSON.stringify({
          initOk: true,
          accountType: "chatgpt",
          threadId: "thread_dry_run",
          turnId: "turn_dry_run",
          turnCompleted: true,
          protocolLineCount: 9,
          stderrLogLineCount: 0,
          eventMethods: ["turn/started", "turn/completed"],
          finalText: '{"status":"ok"}',
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    try {
      // When
      const status = getDesktopAppServerBridgeStatus(runtime, dryRunBridge);
      const result = await runDesktopCodexAppServerSmoke(runtime, dryRunBridge);

      // Then
      expect(status).toBe("available");
      expect(capturedUrl).toBe(dryRunBridge.smokeEndpoint);
      if (result.kind !== "completed") throw new Error("Expected completed dry-run bridge smoke.");
      expect(result.evidence.threadId).toBe("thread_dry_run");
      expect(result.evidence.accountType).toBe("chatgpt");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("parses smoke evidence returned by the Tauri command", async () => {
    // Given
    const runtime: DeckforgeTauriRuntime = {
      core: {
        invoke: async () => ({
          initOk: true,
          accountType: "chatgpt",
          threadId: "thread_live",
          turnId: "turn_live",
          turnCompleted: true,
          protocolLineCount: 7,
          stderrLogLineCount: 1,
          eventMethods: ["turn/started", "turn/completed"],
          finalText: '{"status":"ok"}',
        }),
      },
    };

    // When
    const status = getDesktopAppServerBridgeStatus(runtime);
    const result = await runDesktopCodexAppServerSmoke(runtime);

    // Then
    expect(status).toBe("available");
    if (result.kind !== "completed") throw new Error("Expected completed bridge smoke.");
    expect(result.evidence.threadId).toBe("thread_live");
    expect(result.evidence.turnId).toBe("turn_live");
    expect(result.evidence.protocolLineCount).toBe(7);
    expect(result.evidence.stderrLogLineCount).toBe(1);
  });

  test("returns typed command errors from failed smoke invocations", async () => {
    // Given
    const runtime: DeckforgeTauriRuntime = {
      core: {
        invoke: async () => {
          throw { code: "spawn_failed", message: "failed to start codex app-server" };
        },
      },
    };

    // When
    const result = await runDesktopCodexAppServerSmoke(runtime);

    // Then
    if (result.kind !== "failed") throw new Error("Expected failed bridge smoke.");
    expect(result.error.code).toBe("spawn_failed");
  });

  test("rejects smoke evidence without a completed protocol health turn", async () => {
    // Given
    const runtime: DeckforgeTauriRuntime = {
      core: {
        invoke: async () => ({
          initOk: false,
          accountType: null,
          threadId: " ",
          turnId: "",
          turnCompleted: false,
          protocolLineCount: 0,
          stderrLogLineCount: 3,
          eventMethods: ["turn/started"],
          finalText: "",
        }),
      },
    };

    // When
    const result = await runDesktopCodexAppServerSmoke(runtime);

    // Then
    if (result.kind !== "failed") throw new Error("Expected failed bridge smoke.");
    expect(result.error.code).toBe("invalid_smoke_evidence");
  });

  test("posts structured turns through the packaged dry-run bridge", async () => {
    // Given
    const originalFetch = globalThis.fetch;
    const outputSchema = {
      type: "object",
      required: ["status"],
      properties: { status: { type: "string" } },
    };
    const dryRunBridge: DeckforgeDryRunCodexBridge = {
      enabled: true,
      smokeEndpoint: "http://127.0.0.1/api/codex/app-server/smoke",
      structuredTurnEndpoint: "http://127.0.0.1/api/codex/app-server/structured-turn",
    };

    globalThis.fetch = (async (_input, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        request: {
          prompt: "Return JSON only.",
          outputSchema,
          networkAccess: false,
        },
      });
      return new Response(
        JSON.stringify({
          runtime: "codex app-server --stdio",
          threadId: "thread_dry_run",
          turnId: "turn_dry_run",
          turnCompleted: true,
          durationMs: 1_200,
          protocolLineCount: 8,
          stderrLogLineCount: 0,
          eventMethods: ["turn/completed"],
          notifications: [{ method: "turn/completed", params: { threadId: "thread_dry_run" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    try {
      // When
      const result = await runDesktopCodexAppServerStructuredTurn(
        {
          prompt: "Return JSON only.",
          outputSchema,
          networkAccess: false,
        },
        {},
        dryRunBridge,
      );

      // Then
      if (result.kind !== "completed") throw new Error("Expected completed structured turn.");
      expect(result.evidence.threadId).toBe("thread_dry_run");
      expect(result.evidence.eventMethods).toEqual(["turn/completed"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("parses structured turn notifications returned by the Tauri command", async () => {
    // Given
    const outputSchema = {
      type: "object",
      required: ["status"],
      properties: { status: { type: "string" } },
    };
    const runtime: DeckforgeTauriRuntime = {
      core: {
        invoke: async (command, args) => {
          expect(command).toBe("deckforge_codex_app_server_structured_turn");
          expect(args).toEqual({
            request: {
              prompt: "Return JSON only.",
              outputSchema,
              model: "gpt-5.4",
              networkAccess: false,
              turnTimeoutMs: 600_000,
            },
          });
          return {
            runtime: "codex app-server --stdio",
            threadId: "thread_live",
            turnId: "turn_live",
            turnCompleted: true,
            durationMs: 2_400,
            protocolLineCount: 11,
            stderrLogLineCount: 2,
            eventMethods: ["turn/started", "item/completed", "turn/completed"],
            notifications: [
              {
                method: "turn/started",
                params: { threadId: "thread_live", turn: { id: "turn_live" } },
              },
              {
                method: "turn/completed",
                params: { threadId: "thread_live", turnId: "turn_live" },
              },
            ],
          };
        },
      },
    };

    // When
    const result = await runDesktopCodexAppServerStructuredTurn(
      {
        prompt: "Return JSON only.",
        outputSchema,
        model: "gpt-5.4",
        networkAccess: false,
        turnTimeoutMs: 600_000,
      },
      runtime,
    );

    // Then
    if (result.kind !== "completed") throw new Error("Expected completed structured turn.");
    expect(result.evidence.runtime).toBe("codex app-server --stdio");
    expect(result.evidence.protocolLineCount).toBe(11);
    expect(result.evidence.stderrLogLineCount).toBe(2);
    expect(result.evidence.notifications.map((notification) => notification.method)).toEqual([
      "turn/started",
      "turn/completed",
    ]);
  });

  test("rejects structured turn evidence without a completed protocol turn", async () => {
    // Given
    const runtime: DeckforgeTauriRuntime = {
      core: {
        invoke: async () => ({
          runtime: "codex app-server --stdio",
          threadId: " ",
          turnId: "",
          turnCompleted: false,
          durationMs: 2_400,
          protocolLineCount: 0,
          stderrLogLineCount: 2,
          eventMethods: ["turn/started"],
          notifications: [{ method: "turn/started", params: {} }],
        }),
      },
    };

    // When
    const result = await runDesktopCodexAppServerStructuredTurn(
      {
        prompt: "Return JSON only.",
        outputSchema: { type: "object" },
      },
      runtime,
    );

    // Then
    if (result.kind !== "failed") throw new Error("Expected failed structured turn.");
    expect(result.error.code).toBe("invalid_structured_turn_evidence");
  });
});
