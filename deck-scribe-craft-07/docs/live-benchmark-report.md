# Live Benchmark Report

Date: 2026-06-18

This report defines the 5 live benchmark scenarios required by DF-242. It does not claim that the benchmarks have passed yet.

## 5 live benchmark scenarios

| ID                    | Scenario                           | Required evidence                                            | Current result                                                                                                                                                             |
| --------------------- | ---------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| korean_business       | Korean business proposal, 5 slides | Live text turns, 3 source URLs, 5 live images, export bundle | Blocked - text stages still use mock generation.                                                                                                                           |
| market_research       | Fresh market research deck         | Live search across 3 domains, source capture, evidence map   | Blocked - DF-221 worker live web-search now has a completed six-domain App Server turn, but benchmark output still lacks packaged source capture and evidence-map bundles. |
| chart_report          | Chart-heavy report                 | Dataset evidence, editable chart overlay, report provenance  | Blocked - source capture and live dataset evidence missing.                                                                                                                |
| image_intro           | Image-centered introduction        | 5 binary live image artifacts with Codex turn ids               | Blocked - Generate stage still queues provider `mock`.                                                                                                                     |
| revision_regeneration | Edit and full-slide regeneration   | must_keep, must_change, before/after approval                | Blocked - review UI edits local descriptors.                                                                                                                               |

## Failure taxonomy

- provider: Codex runtime, Codex image auth, quota, or auth failure.
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

- exactly the five required scenarios listed above, with no unknown scenario ids
- the canonical lowercase, unpadded 64-character package archive SHA-256 for the release candidate under benchmark
- output bundle 5 sets, one distinct canonical observed, non-synthetic, non-local `.zip` or `.json` bundle per benchmark
- output bundle manifests matching their benchmark id, bundle path, and package archive SHA-256
- passed benchmark bundle manifests with matching evidence counts, distinct canonical observed scenario report and `live_e2e_report.md` paths, no output bundle, report, Golden Path, or screenshot path that borrows another DF-242 scenario id, distinct canonical non-synthetic final export artifact id, at least 10 distinct canonical observed step screenshot `.png` paths that name every Golden Path step, at least 3 distinct canonical non-synthetic source artifact ids, at least 5 distinct canonical non-synthetic initial live image artifact ids, one separate approved non-synthetic regenerated live image artifact id that is canonical, and at least 5 distinct canonical non-synthetic live image provider turn/request ids
- observed benchmark evidence paths and artifact/provider/export ids must be canonical durable values: no boundary whitespace and no `template`, `sample`, `example`, or `placeholder` marker
- passed benchmark runs must not reuse Golden Path report paths, screenshot paths, source artifact ids, live image artifact ids, or live image provider turn/request ids from another passed benchmark run, including request ids that appear alongside distinct Codex turn ids
- at least four of the five required `live` scenario runs whose Live Golden Path completed
- no mock scores counted in Live pass totals
- failure classification strictly limited to provider, context, research, image, renderer, or editor for every failed or blocked benchmark
- the exact committed `docs/live-benchmark-report.md` report path; a same-named report in `tmp/`, `reports/`, or any other location is not DF-242 release evidence

Blocking issue codes:

- `missing_benchmark_scenario`
- `duplicate_benchmark_scenario`
- `unknown_benchmark_scenario`
- `missing_benchmark_package_hash`
- `invalid_benchmark_package_hash`
- `missing_output_bundle` - missing, synthetic, developer-local, or observer-template output bundle path
- `missing_output_bundle_manifest`
- `duplicate_output_bundle`
- `duplicate_output_bundle_report`
- `output_bundle_benchmark_mismatch`
- `output_bundle_package_mismatch`
- `output_bundle_evidence_count_mismatch`
- `output_bundle_report_missing` - missing, synthetic, developer-local, or observer-template scenario report path
- `output_bundle_export_missing`
- `duplicate_output_bundle_artifact`
- `duplicate_output_bundle_screenshot`
- `output_bundle_step_screenshot_missing` - passed benchmark screenshot evidence does not name every Golden Path step.
- `output_bundle_scenario_evidence_mismatch` - passed benchmark output bundle, report, Golden Path, or screenshot paths borrow another DF-242 scenario id.
- `duplicate_output_bundle_source_artifact`
- `duplicate_output_bundle_image_artifact`
- `duplicate_output_bundle_image_request`
- `duplicate_output_bundle_golden_path_report`
- `output_bundle_synthetic_artifact_reference` - mock/fixture/test/fake/template/sample/example/placeholder source, image, provider turn/request, regeneration, or export artifact ids in passed bundles
- `output_bundle_golden_path_evidence_missing` - missing screenshot paths, sources, initial images, image provider turn/request ids, or observed non-synthetic, non-local Golden Path report evidence
- `output_bundle_regeneration_image_missing` - missing approved full-slide regeneration image artifact evidence from a passed benchmark output bundle
- `mock_score_contamination`
- `invalid_failure_domain`
- `live_benchmark_invalid_failure_domain`
- `missing_failure_domain`
- `passed_failure_domain_present`
- `golden_path_not_completed`
- `live_benchmark_shortfall`
- `missing_live_benchmark_report`

Current local status: the validator is implemented and tested, including rejection of unknown or duplicate benchmark scenarios, unsupported failure domains at both evidence-bundle and release-gate level, non-canonical uppercase package SHA evidence, `mock`, `fixture`, `test`, `fake`, `template`, `sample`, `example`, `placeholder`, developer-local absolute, and `file://` output bundle paths and report paths, top-level benchmark report paths outside the exact committed `docs/live-benchmark-report.md` location, benchmark report paths, scenario report paths, source/image artifact ids, and final export artifact ids that only become valid after trimming whitespace, synthetic or observer-template source/image/provider turn or request/regeneration/export artifact ids, evidence count/list mismatches, duplicate scenario report reuse, cross-scenario borrowed output bundle/report/Golden Path/screenshot paths, missing, reused, or non-step-named screenshot path evidence, missing regenerated image artifact evidence, regenerated images counted toward the initial five-image floor, plus cross-run source/image/provider turn or request evidence reuse even when a bundle contains both distinct turn ids and reused request ids, but no real provider output bundle 5 sets have been produced.

## 2026-06-21 KST lane evidence update

This ticket remains hard-blocked on downstream packaged Live Golden Path
benchmark execution. `release-artifacts` contains no benchmark output bundles;
it contains only `DeckForge_0.1.0_aarch64.dmg`, its checksum, and `README.md`.
The DMG checksum matches its committed `.sha256` file, but the mounted
`/Volumes/DeckForge/DeckForge.app` fails both `codesign --verify` and `spctl
--assess` with `code has no resources but signature indicates they must be
present`. The current benchmark result remains 0 of 5, below the required 4 of
5 named packaged Live Golden Path completions. See
`docs/live-research-lane-blockers-2026-06-21.md`.

## 2026-06-21 Lane F Recheck

Lane F regenerated the unsigned internal package and DMG on branch `jacobex/live-lane-release-gates`, but produced 0 benchmark scenario output bundles. Current package evidence:

- Dry-run package SHA-256: `cec0077d117f8cc2d863db2075bbbd55cc812830e91233474a9f550ee6de427b`.
- DMG SHA-256: `232d0fd67eed137ff8b048848823d95cd71f2c8cd044a07ba279defd0a934108`.
- Package scan found no fixed-string mock/fixture/test/local-path contamination in the dry-run app bundle, native `.app`, or mounted DMG.

Current benchmark result remains 0 of 5, below the required 4 of 5 passed live scenarios. Next evidence needed: five distinct non-synthetic benchmark output bundles, each tied to the current package hash and real Golden Path evidence, with at least four passing named live scenarios.
