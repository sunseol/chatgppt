import type {
  LiveBenchmarkEvidenceIssue,
  LiveBenchmarkEvidenceIssueCode,
  LiveBenchmarkFailureDomain,
  LiveBenchmarkRun,
} from "./live-benchmark-evidence";

const LIVE_BENCHMARK_FAILURE_DOMAINS = [
  "none",
  "provider",
  "context",
  "research",
  "image",
  "renderer",
  "editor",
] as const satisfies readonly LiveBenchmarkFailureDomain[];

const VALID_FAILURE_DOMAINS = new Set<string>(LIVE_BENCHMARK_FAILURE_DOMAINS);

export function isLiveBenchmarkFailureDomain(value: string): value is LiveBenchmarkFailureDomain {
  return VALID_FAILURE_DOMAINS.has(value);
}

export function failureDomainIssues(
  runs: readonly LiveBenchmarkRun[],
): readonly LiveBenchmarkEvidenceIssue[] {
  const invalid = runs
    .filter((run) => !VALID_FAILURE_DOMAINS.has(run.failureDomain))
    .map((run) => `${run.id}:${run.failureDomain}`);
  const unclassified = runs
    .filter((run) => run.status !== "passed" && run.failureDomain === "none")
    .map((run) => run.id);
  const passedWithFailureDomain = runs
    .filter((run) => run.status === "passed" && run.failureDomain !== "none")
    .map((run) => run.id);
  return [
    ...(invalid.length === 0
      ? []
      : [
          issue(
            "invalid_failure_domain",
            "Live benchmark failure domains must match the DF-242 taxonomy.",
            invalid,
          ),
        ]),
    ...(unclassified.length === 0
      ? []
      : [
          issue(
            "missing_failure_domain",
            "Failed Live benchmarks require a failure domain.",
            unclassified,
          ),
        ]),
    ...(passedWithFailureDomain.length === 0
      ? []
      : [
          issue(
            "passed_failure_domain_present",
            "Passed Live benchmarks must not retain a failure domain.",
            passedWithFailureDomain,
          ),
        ]),
  ];
}

function issue(
  code: LiveBenchmarkEvidenceIssueCode,
  message: string,
  refs: readonly string[],
): LiveBenchmarkEvidenceIssue {
  return { code, message, refs };
}
