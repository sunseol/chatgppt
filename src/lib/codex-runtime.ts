export const SUPPORTED_CODEX_RUNTIME = {
  minInclusive: "1.0.0",
  maxExclusive: "2.0.0",
} as const;

export type CodexRuntimeEvidence =
  | { readonly kind: "missing" }
  | {
      readonly kind: "found";
      readonly executablePath: string;
      readonly version: string;
      readonly canExecute: boolean;
    };

export type CodexRuntimeStatus =
  | {
      readonly kind: "missing";
      readonly supportedRange: typeof SUPPORTED_CODEX_RUNTIME;
      readonly message: string;
      readonly remediation: string;
    }
  | {
      readonly kind: "permissionDenied";
      readonly executablePath: string;
      readonly version: string;
      readonly supportedRange: typeof SUPPORTED_CODEX_RUNTIME;
      readonly message: string;
      readonly remediation: string;
    }
  | {
      readonly kind: "unsupportedVersion";
      readonly executablePath: string;
      readonly version: string;
      readonly supportedRange: typeof SUPPORTED_CODEX_RUNTIME;
      readonly message: string;
      readonly remediation: string;
    }
  | {
      readonly kind: "ready";
      readonly executablePath: string;
      readonly version: string;
      readonly supportedRange: typeof SUPPORTED_CODEX_RUNTIME;
      readonly message: string;
    };

export type CodexAppServerBootstrapEvidence =
  | { readonly kind: "notStarted" }
  | {
      readonly kind: "running";
      readonly cliVersion: string;
      readonly appServerVersion: string;
    }
  | {
      readonly kind: "startFailed";
      readonly exitCode: number;
      readonly stderr: string;
    };

export type CodexAppServerBootstrapStatus =
  | {
      readonly kind: "ready";
      readonly cliVersion: string;
      readonly appServerVersion: string;
      readonly message: string;
    }
  | {
      readonly kind: "notRunning";
      readonly message: string;
      readonly remediation: string;
      readonly retryable: true;
    }
  | {
      readonly kind: "standaloneInstallMissing";
      readonly message: string;
      readonly remediation: string;
      readonly retryable: true;
    }
  | {
      readonly kind: "startFailed";
      readonly exitCode: number;
      readonly message: string;
      readonly remediation: string;
      readonly retryable: true;
    };

export function formatSupportedCodexRuntimeRange(
  range: typeof SUPPORTED_CODEX_RUNTIME = SUPPORTED_CODEX_RUNTIME,
): string {
  return `${range.minInclusive} 이상 ${range.maxExclusive} 미만`;
}

export function evaluateCodexRuntime(evidence: CodexRuntimeEvidence): CodexRuntimeStatus {
  if (evidence.kind === "missing") {
    return {
      kind: "missing",
      supportedRange: SUPPORTED_CODEX_RUNTIME,
      message: "Codex CLI was not found on this device.",
      remediation: "Install Codex CLI, then retry runtime discovery.",
    };
  }

  if (!evidence.canExecute) {
    return {
      kind: "permissionDenied",
      executablePath: evidence.executablePath,
      version: evidence.version,
      supportedRange: SUPPORTED_CODEX_RUNTIME,
      message: `Codex CLI at ${evidence.executablePath} is not executable.`,
      remediation: "Fix file permissions or reinstall Codex CLI, then retry.",
    };
  }

  if (!isSupportedVersion(evidence.version)) {
    return {
      kind: "unsupportedVersion",
      executablePath: evidence.executablePath,
      version: evidence.version,
      supportedRange: SUPPORTED_CODEX_RUNTIME,
      message: `Codex CLI ${evidence.version} is outside the supported runtime range.`,
      remediation: "Upgrade Codex CLI to a supported version, then retry.",
    };
  }

  return {
    kind: "ready",
    executablePath: evidence.executablePath,
    version: evidence.version,
    supportedRange: SUPPORTED_CODEX_RUNTIME,
    message: `Codex CLI ${evidence.version} is available.`,
  };
}

export function evaluateCodexAppServerBootstrap(
  evidence: CodexAppServerBootstrapEvidence,
): CodexAppServerBootstrapStatus {
  switch (evidence.kind) {
    case "running":
      return {
        kind: "ready",
        cliVersion: evidence.cliVersion,
        appServerVersion: evidence.appServerVersion,
        message: `Codex App Server ${evidence.appServerVersion} is running.`,
      };
    case "notStarted":
      return {
        kind: "notRunning",
        message: "Codex App Server is not running.",
        remediation: "Start the Codex app-server daemon before running Live text jobs.",
        retryable: true,
      };
    case "startFailed":
      return failedAppServerBootstrap(evidence);
    default:
      return assertNever(evidence);
  }
}

function failedAppServerBootstrap(
  evidence: Extract<CodexAppServerBootstrapEvidence, { readonly kind: "startFailed" }>,
): CodexAppServerBootstrapStatus {
  if (evidence.stderr.includes("managed standalone Codex install not found")) {
    return {
      kind: "standaloneInstallMissing",
      message: "Codex App Server cannot start because the managed standalone install is missing.",
      remediation:
        "Install the standalone Codex package with the official installer, then retry app-server daemon start.",
      retryable: true,
    };
  }

  return {
    kind: "startFailed",
    exitCode: evidence.exitCode,
    message: "Codex App Server failed to start.",
    remediation: "Inspect the app-server daemon stderr and retry after fixing the runtime issue.",
    retryable: true,
  };
}

function isSupportedVersion(version: string): boolean {
  return (
    compareVersions(version, SUPPORTED_CODEX_RUNTIME.minInclusive) >= 0 &&
    compareVersions(version, SUPPORTED_CODEX_RUNTIME.maxExclusive) < 0
  );
}

function compareVersions(left: string, right: string): number {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  for (let index = 0; index < leftParts.length; index++) {
    const diff = leftParts[index] - rightParts[index];
    if (diff !== 0) return diff;
  }
  return 0;
}

function parseVersion(version: string): readonly [number, number, number] {
  const [major = "0", minor = "0", patch = "0"] = version.split(".");
  return [Number(major), Number(minor), Number(patch)];
}

function assertNever(value: never): never {
  throw new Error(`Unhandled Codex app-server evidence: ${String(value)}`);
}
