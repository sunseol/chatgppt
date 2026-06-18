export type CodexAppServerTransport = "daemon" | "stdio";

export type CodexAppServerInitializeResponse = {
  readonly userAgent: string;
  readonly codexHome: string;
  readonly platformFamily: string;
  readonly platformOs: string;
};

export type CodexAppServerInitializeSmokeEvidence =
  | {
      readonly kind: "initialized";
      readonly transport: CodexAppServerTransport;
      readonly cliVersion: string;
      readonly requestId: number;
      readonly response: CodexAppServerInitializeResponse;
      readonly stderrWarnings: readonly string[];
    }
  | {
      readonly kind: "failed";
      readonly transport: CodexAppServerTransport;
      readonly exitCode: number;
      readonly stderr: string;
    };

export type CodexAppServerInitializeSmokeStatus =
  | {
      readonly kind: "ready";
      readonly transport: CodexAppServerTransport;
      readonly cliVersion: string;
      readonly requestId: number;
      readonly platformFamily: string;
      readonly platformOs: string;
      readonly userAgent: string;
      readonly warningCount: number;
      readonly message: string;
    }
  | {
      readonly kind: "failed";
      readonly transport: CodexAppServerTransport;
      readonly exitCode: number;
      readonly message: string;
      readonly remediation: string;
      readonly retryable: true;
    };

export type CodexAppServerHealthAccount = {
  readonly type: "apiKey" | "chatgpt" | "amazonBedrock";
  readonly requiresOpenaiAuth: boolean;
};

export type CodexAppServerHealthTurnEvidence =
  | {
      readonly kind: "completed";
      readonly transport: CodexAppServerTransport;
      readonly cliVersion: string;
      readonly account: CodexAppServerHealthAccount;
      readonly threadId: string;
      readonly turnId: string;
      readonly turnStatus: "completed";
    }
  | {
      readonly kind: "failed";
      readonly transport: CodexAppServerTransport;
      readonly cliVersion: string;
      readonly account: CodexAppServerHealthAccount | null;
      readonly threadId: string | null;
      readonly turnId: string | null;
      readonly failureReason: string;
    };

export type CodexAppServerHealthTurnStatus =
  | {
      readonly kind: "ready";
      readonly transport: CodexAppServerTransport;
      readonly cliVersion: string;
      readonly accountType: CodexAppServerHealthAccount["type"];
      readonly threadId: string;
      readonly turnId: string;
      readonly message: string;
    }
  | {
      readonly kind: "failed";
      readonly transport: CodexAppServerTransport;
      readonly cliVersion: string;
      readonly message: string;
      readonly remediation: string;
      readonly retryable: true;
    };

export type CodexAppServerRestartSmokeEvidence =
  | {
      readonly kind: "restarted";
      readonly cliVersion: string;
      readonly appServerVersion: string;
      readonly oldPid: number;
      readonly newPid: number;
      readonly crashProbeError: string;
      readonly postRestartHealthTurn: Extract<
        CodexAppServerHealthTurnEvidence,
        { readonly kind: "completed" }
      >;
    }
  | {
      readonly kind: "restartFailed";
      readonly cliVersion: string;
      readonly oldPid: number;
      readonly crashProbeError: string;
      readonly restartError: string;
    };

export type CodexAppServerRestartSmokeStatus =
  | {
      readonly kind: "ready";
      readonly cliVersion: string;
      readonly appServerVersion: string;
      readonly oldPid: number;
      readonly newPid: number;
      readonly threadId: string;
      readonly turnId: string;
      readonly message: string;
    }
  | {
      readonly kind: "failed";
      readonly cliVersion: string;
      readonly message: string;
      readonly remediation: string;
      readonly retryable: true;
    };

export function evaluateCodexAppServerInitializeSmoke(
  evidence: CodexAppServerInitializeSmokeEvidence,
): CodexAppServerInitializeSmokeStatus {
  switch (evidence.kind) {
    case "initialized":
      return {
        kind: "ready",
        transport: evidence.transport,
        cliVersion: evidence.cliVersion,
        requestId: evidence.requestId,
        platformFamily: evidence.response.platformFamily,
        platformOs: evidence.response.platformOs,
        userAgent: evidence.response.userAgent,
        warningCount: evidence.stderrWarnings.length,
        message: `Codex App Server initialize succeeded over ${evidence.transport}.`,
      };
    case "failed":
      return {
        kind: "failed",
        transport: evidence.transport,
        exitCode: evidence.exitCode,
        message: "Codex App Server initialize smoke failed.",
        remediation:
          "Inspect app-server stderr and retry initialize before starting Live text jobs.",
        retryable: true,
      };
    default:
      return assertNever(evidence);
  }
}

export function evaluateCodexAppServerHealthTurn(
  evidence: CodexAppServerHealthTurnEvidence,
): CodexAppServerHealthTurnStatus {
  switch (evidence.kind) {
    case "completed":
      return {
        kind: "ready",
        transport: evidence.transport,
        cliVersion: evidence.cliVersion,
        accountType: evidence.account.type,
        threadId: evidence.threadId,
        turnId: evidence.turnId,
        message: "Codex App Server authenticated health turn completed.",
      };
    case "failed":
      return {
        kind: "failed",
        transport: evidence.transport,
        cliVersion: evidence.cliVersion,
        message: "Codex App Server authenticated health turn failed.",
        remediation: "Retry the health turn and inspect App Server turn errors.",
        retryable: true,
      };
    default:
      return assertNever(evidence);
  }
}

export function evaluateCodexAppServerRestartSmoke(
  evidence: CodexAppServerRestartSmokeEvidence,
): CodexAppServerRestartSmokeStatus {
  switch (evidence.kind) {
    case "restarted":
      return {
        kind: "ready",
        cliVersion: evidence.cliVersion,
        appServerVersion: evidence.appServerVersion,
        oldPid: evidence.oldPid,
        newPid: evidence.newPid,
        threadId: evidence.postRestartHealthTurn.threadId,
        turnId: evidence.postRestartHealthTurn.turnId,
        message: "Codex App Server restarted after crash and completed a health turn.",
      };
    case "restartFailed":
      return {
        kind: "failed",
        cliVersion: evidence.cliVersion,
        message: "Codex App Server crash restart smoke failed.",
        remediation: "Restart the daemon and rerun an authenticated post-restart health turn.",
        retryable: true,
      };
    default:
      return assertNever(evidence);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled Codex app-server initialize smoke evidence: ${String(value)}`);
}
