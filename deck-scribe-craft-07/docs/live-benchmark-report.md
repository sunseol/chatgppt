# Live Benchmark Report

Date: 2026-06-18

This report defines the 5 live benchmark scenarios required by DF-242. It does not claim that the benchmarks have passed yet.

## 5 live benchmark scenarios

| ID                    | Scenario                           | Required evidence                                            | Current result                                                                                                                                                             |
| --------------------- | ---------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| korean_business       | Korean business proposal, 5 slides | Live text turns, 3 source URLs, 5 live images, export bundle | Blocked - text stages still use mock generation.                                                                                                                           |
| market_research       | Fresh market research deck         | Live search across 3 domains, source capture, evidence map   | Blocked - DF-221 worker live web-search now has a completed six-domain App Server turn, but benchmark output still lacks packaged source capture and evidence-map bundles. |
| chart_report          | Chart-heavy report                 | Dataset evidence, editable chart overlay, report provenance  | Blocked - source capture and live dataset evidence missing.                                                                                                                |
| image_intro           | Image-centered introduction        | 5 binary live image artifacts with request ids               | Blocked - Generate stage still queues provider `mock`.                                                                                                                     |
| revision_regeneration | Edit and full-slide regeneration   | must_keep, must_change, before/after approval                | Blocked - review UI edits local descriptors.                                                                                                                               |

## Failure taxonomy

- provider: Codex runtime, image API credential, quota, or auth failure.
- context: stale approved artifact bundle or deck_context_id mismatch.
- research: source search, capture, evidence, or approval failure.
- image: generation, rate limit, cancellation, or binary artifact failure.
- renderer: compositor, overlay, or export rendering failure.
- editor: title edit, layer preservation, or regeneration comparison failure.

## Current gate result

Passed live benchmarks: 0 of 5.

Release requirement: at least 4 of 5 live benchmarks must pass without counting mock benchmark scores.

## Local evidence contract

`src/lib/live-benchmark-evidence.ts` validates the DF-242 evidence bundle before benchmark results can count toward Live release. The bundle must include:

- exactly the five required scenarios listed above
- the 64-character package archive SHA-256 for the release candidate under benchmark
- output bundle 5 sets, one distinct bundle per benchmark
- output bundle manifests matching their benchmark id, bundle path, and package archive SHA-256
- passed benchmark bundle manifests with a scenario report, final export artifact id, `live_e2e_report.md`, at least 10 step screenshots, at least 3 distinct source artifact ids, at least 5 distinct live image artifact ids, and at least 5 distinct live image request ids
- at least four `live` runs whose Live Golden Path completed
- no mock scores counted in Live pass totals
- failure classification as provider, context, research, image, renderer, or editor for every failed or blocked benchmark
- a `docs/live-benchmark-report.md` report path

Blocking issue codes:

- `missing_benchmark_scenario`
- `duplicate_benchmark_scenario`
- `missing_benchmark_package_hash`
- `invalid_benchmark_package_hash`
- `missing_output_bundle`
- `missing_output_bundle_manifest`
- `duplicate_output_bundle`
- `output_bundle_benchmark_mismatch`
- `output_bundle_package_mismatch`
- `output_bundle_report_missing`
- `output_bundle_export_missing`
- `output_bundle_golden_path_evidence_missing`
- `mock_score_contamination`
- `missing_failure_domain`
- `passed_failure_domain_present`
- `golden_path_not_completed`
- `live_benchmark_shortfall`
- `missing_live_benchmark_report`

Current local status: the validator is implemented and tested, but no real provider output bundle 5 sets have been produced.
