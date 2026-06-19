import { outputBundleIssues } from "./live-benchmark-output-bundle";
import { packageHashIssues } from "./live-benchmark-package-hash";

export const LIVE_BENCHMARK_IDS = [
  "korean_business",
  "market_research",
  "chart_report",
  "image_intro",
  "revision_regeneration",
] as const;

export type LiveBenchmarkId = (typeof LIVE_BENCHMARK_IDS)[number];
export type LiveBenchmarkStatus = "passed" | "failed" | "blocked";
export type LiveBenchmarkSource = "live" | "mock";
export type LiveBenchmarkFailureDomain =
  | "none"
  | "provider"
  | "context"
  | "research"
  | "image"
  | "renderer"
  | "editor";

export type LiveBenchmarkOutputBundleManifest = {
  readonly path: string;
  readonly benchmarkId: LiveBenchmarkId;
  readonly packageArchiveSha256: string;
  readonly reportPath: string;
  readonly goldenPathReportPath: string;
  readonly exportArtifactId: string;
  readonly screenshotCount: number;
  readonly sourceCount: number;
  readonly sourceArtifactIds: readonly string[];
  readonly imageArtifactCount: number;
  readonly liveImageArtifactIds: readonly string[];
};

export type LiveBenchmarkRun = {
  readonly id: LiveBenchmarkId;
  readonly status: LiveBenchmarkStatus;
  readonly failureDomain: LiveBenchmarkFailureDomain;
  readonly source: LiveBenchmarkSource;
  readonly score: number;
  readonly mockScore: number;
  readonly goldenPathCompleted: boolean;
  readonly outputBundlePath: string;
  readonly outputBundle: LiveBenchmarkOutputBundleManifest;
};

export type LiveBenchmarkEvidenceBundle = {
  readonly reportPath: string;
  readonly packageArchiveSha256: string;
  readonly runs: readonly LiveBenchmarkRun[];
};

export type LiveBenchmarkEvidenceIssueCode =
  | "missing_benchmark_scenario"
  | "missing_benchmark_package_hash"
  | "invalid_benchmark_package_hash"
  | "missing_output_bundle"
  | "missing_output_bundle_manifest"
  | "duplicate_output_bundle"
  | "output_bundle_benchmark_mismatch"
  | "output_bundle_package_mismatch"
  | "output_bundle_report_missing"
  | "output_bundle_export_missing"
  | "output_bundle_golden_path_evidence_missing"
  | "mock_score_contamination"
  | "missing_failure_domain"
  | "passed_failure_domain_present"
  | "golden_path_not_completed"
  | "live_benchmark_shortfall"
  | "missing_live_benchmark_report";

export type LiveBenchmarkEvidenceIssue = {
  readonly code: LiveBenchmarkEvidenceIssueCode;
  readonly message: string;
  readonly refs: readonly string[];
};

export type LiveBenchmarkEvidenceResult =
  | { readonly kind: "ready"; readonly passedLiveCount: number }
  | {
      readonly kind: "blocked";
      readonly passedLiveCount: number;
      readonly issues: readonly LiveBenchmarkEvidenceIssue[];
    };

export function evaluateLiveBenchmarkEvidence(
  bundle: LiveBenchmarkEvidenceBundle,
): LiveBenchmarkEvidenceResult {
  const passedLiveCount = countPassedLiveBenchmarks(bundle.runs);
  const issues = [
    ...scenarioIssues(bundle.runs),
    ...packageHashIssues(bundle.packageArchiveSha256),
    ...outputBundleIssues(bundle.runs, bundle.packageArchiveSha256),
    ...mockScoreIssues(bundle.runs),
    ...failureDomainIssues(bundle.runs),
    ...goldenPathIssues(bundle.runs),
    ...shortfallIssues(passedLiveCount),
    ...reportIssues(bundle.reportPath),
  ];

  return issues.length === 0
    ? { kind: "ready", passedLiveCount }
    : { kind: "blocked", passedLiveCount, issues };
}

export function formatLiveBenchmarkEvidenceSummary(bundle: LiveBenchmarkEvidenceBundle): string {
  const passedLiveCount = countPassedLiveBenchmarks(bundle.runs);
  const mockScoresCounted = bundle.runs.filter(
    (run) => run.status === "passed" && (run.source !== "live" || run.mockScore > 0),
  ).length;
  return [
    "# DF-242 Live Benchmarks",
    `Report: ${bundle.reportPath || "missing"}`,
    `Package archive: ${bundle.packageArchiveSha256 || "missing"}`,
    `Passed live benchmarks: ${passedLiveCount} of ${LIVE_BENCHMARK_IDS.length}`,
    `Mock scores counted: ${mockScoresCounted}`,
    ...bundle.runs.map((run) => `${run.id}: ${run.status}/${run.failureDomain}`),
  ].join("\n");
}

function countPassedLiveBenchmarks(runs: readonly LiveBenchmarkRun[]): number {
  return runs.filter(
    (run) => run.status === "passed" && run.source === "live" && run.goldenPathCompleted,
  ).length;
}

function scenarioIssues(runs: readonly LiveBenchmarkRun[]): readonly LiveBenchmarkEvidenceIssue[] {
  const present = new Set(runs.map((run) => run.id));
  const missing = LIVE_BENCHMARK_IDS.filter((id) => !present.has(id));
  return missing.length === 0
    ? []
    : [
        issue(
          "missing_benchmark_scenario",
          "All five Live benchmark scenarios are required.",
          missing,
        ),
      ];
}

function mockScoreIssues(runs: readonly LiveBenchmarkRun[]): readonly LiveBenchmarkEvidenceIssue[] {
  const contaminated = runs
    .filter((run) => run.status === "passed" && (run.source !== "live" || run.mockScore > 0))
    .map((run) => run.id);
  return contaminated.length === 0
    ? []
    : [
        issue(
          "mock_score_contamination",
          "Mock benchmark scores cannot count toward Live benchmark passes.",
          contaminated,
        ),
      ];
}

function failureDomainIssues(
  runs: readonly LiveBenchmarkRun[],
): readonly LiveBenchmarkEvidenceIssue[] {
  const unclassified = runs
    .filter((run) => run.status !== "passed" && run.failureDomain === "none")
    .map((run) => run.id);
  const passedWithFailureDomain = runs
    .filter((run) => run.status === "passed" && run.failureDomain !== "none")
    .map((run) => run.id);
  return [
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

function goldenPathIssues(
  runs: readonly LiveBenchmarkRun[],
): readonly LiveBenchmarkEvidenceIssue[] {
  const incomplete = runs
    .filter((run) => run.status === "passed" && run.source === "live" && !run.goldenPathCompleted)
    .map((run) => run.id);
  return incomplete.length === 0
    ? []
    : [
        issue(
          "golden_path_not_completed",
          "Passed Live benchmarks must complete the Live Golden Path.",
          incomplete,
        ),
      ];
}

function shortfallIssues(passedLiveCount: number): readonly LiveBenchmarkEvidenceIssue[] {
  return passedLiveCount >= 4
    ? []
    : [
        issue("live_benchmark_shortfall", "At least four of five Live benchmarks must pass.", [
          String(passedLiveCount),
        ]),
      ];
}

function reportIssues(reportPath: string): readonly LiveBenchmarkEvidenceIssue[] {
  return reportPath.endsWith("live-benchmark-report.md")
    ? []
    : [
        issue("missing_live_benchmark_report", "Live benchmark report path is required.", [
          reportPath || "missing",
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
