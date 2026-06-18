import type {
  LiveBenchmarkEvidenceIssue,
  LiveBenchmarkEvidenceIssueCode,
} from "./live-benchmark-evidence";

const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/i;

export function packageHashIssues(
  packageArchiveSha256: string,
): readonly LiveBenchmarkEvidenceIssue[] {
  const normalized = packageArchiveSha256.trim();
  if (!normalized) {
    return [
      issue(
        "missing_benchmark_package_hash",
        "Live benchmark evidence must name the package archive SHA-256 it validates.",
        ["missing"],
      ),
    ];
  }
  return SHA_256_HEX_PATTERN.test(normalized)
    ? []
    : [
        issue(
          "invalid_benchmark_package_hash",
          "Live benchmark evidence must use a 64-character SHA-256 package digest.",
          [normalized],
        ),
      ];
}

function issue(
  code: LiveBenchmarkEvidenceIssueCode,
  message: string,
  refs: readonly string[],
): LiveBenchmarkEvidenceIssue {
  return { code, message, refs };
}
