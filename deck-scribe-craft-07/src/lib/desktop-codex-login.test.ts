import { describe, expect, test } from "bun:test";
import {
  openDesktopCodexLoginTerminal,
  readDesktopCodexLoginStatus,
  type DeckforgeTauriRuntime,
} from "./desktop-codex-login";

describe("desktop codex login bridge", () => {
  test("reports missing when the Tauri invoke bridge is absent", async () => {
    const runtime: DeckforgeTauriRuntime = {};

    const status = await readDesktopCodexLoginStatus(runtime);
    const opened = await openDesktopCodexLoginTerminal(runtime);

    expect(status.kind).toBe("missing_bridge");
    expect(opened.kind).toBe("missing_bridge");
  });

  test("reads login status through the Tauri command", async () => {
    const runtime: DeckforgeTauriRuntime = {
      core: {
        invoke: async (command) => {
          expect(command).toBe("deckforge_codex_login_status");
          return {
            command: "codex login status",
            exitCode: 0,
            success: true,
            stdout: "Logged in using ChatGPT\n",
            stderr: "",
          };
        },
      },
    };

    const result = await readDesktopCodexLoginStatus(runtime);

    if (result.kind !== "completed") throw new Error("Expected completed login status.");
    expect(result.evidence.success).toBe(true);
    expect(result.evidence.stdout.includes("Logged in using ChatGPT")).toBe(true);
  });

  test("opens a terminal login command through Tauri", async () => {
    const runtime: DeckforgeTauriRuntime = {
      core: {
        invoke: async (command) => {
          expect(command).toBe("deckforge_open_codex_login_terminal");
          return {
            command: "codex login",
            launched: true,
          };
        },
      },
    };

    const result = await openDesktopCodexLoginTerminal(runtime);

    if (result.kind !== "opened") throw new Error("Expected opened login terminal.");
    expect(result.evidence.command).toBe("codex login");
  });
});
