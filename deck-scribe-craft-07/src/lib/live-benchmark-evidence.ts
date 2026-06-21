import { failureDomainIssues } from "./live-benchmark-failure-domain";
import { hasObservedBenchmarkEvidencePath } from "./live-benchmark-evidence-path";
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
  readonly screenshotPaths?: readonly string[];
  readonly sourceCount: number;
  readonly sourceArtifactIds: readonly string[];
  readonly imageArtifactCount: number;
  readonly liveImageArtifactIds: readonly string[];
  readonly regeneratedLiveImageArtifactIds?: readonly string[];
  readonly liveImageTurnIds?: readonly string[];
  readonly liveImageRequestIds?: readonly string[];
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
  | "duplicate_benchmark_scenario"
  | "unknown_benchmark_scenario"
  | "missing_benchmark_package_hash"
  | "invalid_benchmark_package_hash"
  | "missing_output_bundle"
  | "missing_output_bundle_manifest"
  | "duplicate_output_bundle"
  | "duplicate_output_bundle_report"
  | "output_bundle_benchmark_mismatch"
  | "output_bundle_package_mismatch"
  | "output_bundle_evidence_count_mismatch"
  | "output_bundle_report_missing"
  | "output_bundle_export_missing"
  | "duplicate_output_bundle_artifact"
  | "duplicate_output_bundle_screenshot"
  | "output_bundle_step_screenshot_missing"
  | "output_bundle_scenario_evidence_mismatch"
  | "duplicate_output_bundle_source_artifact"
  | "duplicate_output_bundle_image_artifact"
  | "duplicate_output_bundle_image_request"
  | "duplicate_output_bundle_golden_path_report"
  | "output_bundle_synthetic_artifact_reference"
  | "output_bundle_golden_path_evidence_missing"
  | "output_bundle_regeneration_image_missing"
  | "mock_score_contamination"
  | "invalid_failure_domain"
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

function countPassedLiveBenchmarks(runs: readonly LiveBenchmarkRun[]): number {
  return runs.filter(
    (run) =>
      isLiveBenchmarkId(run.id) &&
      run.status === "passed" &&
      run.source === "live" &&
      run.goldenPathCompleted,
  ).length;
}

function scenarioIssues(runs: readonly LiveBenchmarkRun[]): readonly LiveBenchmarkEvidenceIssue[] {
  const present = new Set(runs.filter((run) => isLiveBenchmarkId(run.id)).map((run) => run.id));
  const unknown = uniqueRefs(runs.map((run) => run.id).filter((id) => !isLiveBenchmarkId(id)));
  const missing = LIVE_BENCHMARK_IDS.filter((id) => !present.has(id));
  const duplicates = duplicateScenarioIds(runs);
  return [
    ...(unknown.length === 0
      ? []
      : [
          issue(
            "unknown_benchmark_scenario",
            "Live benchmark evidence may only include the five DF-242 scenarios.",
            unknown,
          ),
        ]),
    ...(missing.length === 0
      ? []
      : [
          issue(
            "missing_benchmark_scenario",
            "All five Live benchmark scenarios are required.",
            missing,
          ),
        ]),
    ...(duplicates.length === 0
      ? []
      : [
          issue(
            "duplicate_benchmark_scenario",
            "Each Live benchmark scenario must appear exactly once.",
            duplicates,
          ),
        ]),
  ];
}

function duplicateScenarioIds(runs: readonly LiveBenchmarkRun[]): readonly string[] {
  const counts = runs.reduce(
    (nextCounts, run) =>
      isLiveBenchmarkId(run.id) ? { ...nextCounts, [run.id]: nextCounts[run.id] + 1 } : nextCounts,
    {
      korean_business: 0,
      market_research: 0,
      chart_report: 0,
      image_intro: 0,
      revision_regeneration: 0,
    } satisfies Record<LiveBenchmarkId, number>,
  );
  return LIVE_BENCHMARK_IDS.filter((id) => counts[id] > 1);
}

function isLiveBenchmarkId(value: string): value is LiveBenchmarkId {
  return (LIVE_BENCHMARK_IDS as readonly string[]).includes(value);
}

function uniqueRefs(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
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
  const normalized = reportPath.toLowerCase().trim();
  return normalized.endsWith("live-benchmark-report.md") &&
    hasObservedBenchmarkEvidencePath(reportPath, [".md"])
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
