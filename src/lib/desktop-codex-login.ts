import { z } from "zod";
import {
  getTauriRuntime,
  type CodexAppServerSmokeError,
  type DeckforgeTauriRuntime,
} from "./desktop-app-server-bridge";

export type { DeckforgeTauriRuntime };

const CodexLoginStatusEvidenceSchema = z.object({
  command: z.string(),
  exitCode: z.number().int().nullable(),
  success: z.boolean(),
  stdout: z.string(),
  stderr: z.string(),
});

const CodexLoginLaunchEvidenceSchema = z.object({
  command: z.string(),
  launched: z.boolean(),
});

const CodexCliCommandErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type CodexLoginStatusEvidence = Readonly<z.infer<typeof CodexLoginStatusEvidenceSchema>>;

export type CodexLoginLaunchEvidence = Readonly<z.infer<typeof CodexLoginLaunchEvidenceSchema>>;

export type DesktopCodexLoginStatusResult =
  | { readonly kind: "missing_bridge" }
  | { readonly kind: "completed"; readonly evidence: CodexLoginStatusEvidence }
  | { readonly kind: "failed"; readonly error: CodexAppServerSmokeError };

export type DesktopCodexLoginTerminalResult =
  | { readonly kind: "missing_bridge" }
  | { readonly kind: "opened"; readonly evidence: CodexLoginLaunchEvidence }
  | { readonly kind: "failed"; readonly error: CodexAppServerSmokeError };

export async function readDesktopCodexLoginStatus(
  runtime: DeckforgeTauriRuntime | undefined = getTauriRuntime(),
): Promise<DesktopCodexLoginStatusResult> {
  const invoke = runtime?.core?.invoke;
  if (!invoke) return { kind: "missing_bridge" };

  try {
    return {
      kind: "completed",
      evidence: CodexLoginStatusEvidenceSchema.parse(await invoke("deckforge_codex_login_status")),
    };
  } catch (error) {
    return { kind: "failed", error: parseCodexLoginError(error, "invalid_login_status") };
  }
}

export async function openDesktopCodexLoginTerminal(
  runtime: DeckforgeTauriRuntime | undefined = getTauriRuntime(),
): Promise<DesktopCodexLoginTerminalResult> {
  const invoke = runtime?.core?.invoke;
  if (!invoke) return { kind: "missing_bridge" };

  try {
    return {
      kind: "opened",
      evidence: CodexLoginLaunchEvidenceSchema.parse(
        await invoke("deckforge_open_codex_login_terminal"),
      ),
    };
  } catch (error) {
    return { kind: "failed", error: parseCodexLoginError(error, "open_login_failed") };
  }
}

function parseCodexLoginError(error: unknown, fallbackCode: string): CodexAppServerSmokeError {
  if (error instanceof z.ZodError) {
    return { code: fallbackCode, message: error.message };
  }
  const parsed = CodexCliCommandErrorSchema.safeParse(error);
  if (parsed.success) return parsed.data;
  if (error instanceof Error) return { code: "invoke_failed", message: error.message };
  throw error;
}
