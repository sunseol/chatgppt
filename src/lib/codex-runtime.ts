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
