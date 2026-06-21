import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOCS = {
  audit: new URL("../../docs/live-readiness-audit.md", import.meta.url),
  migration: new URL("../../docs/ticket-status-migration-report.md", import.meta.url),
  benchmark: new URL("../../docs/live-benchmark-report.md", import.meta.url),
  goldenPath: new URL("../../docs/live-golden-path-e2e.md", import.meta.url),
  interviewCutover: new URL("../../docs/live-interview-cutover.md", import.meta.url),
  imagePathDecision: new URL("../../docs/live-image-path-decision.md", import.meta.url),
  imageArtifactStorage: new URL("../../docs/live-image-artifact-storage.md", import.meta.url),
  backgroundBatch: new URL("../../docs/live-background-batch.md", import.meta.url),
  imageQueueControls: new URL("../../docs/live-image-queue-controls.md", import.meta.url),
  interruptionMatrix: new URL("../../docs/live-interruption-matrix.md", import.meta.url),
  usageSummary: new URL("../../docs/live-usage-summary.md", import.meta.url),
  runbook: new URL("../../docs/production-clean-machine-runbook.md", import.meta.url),
  manualQa: new URL("../../docs/live-manual-qa-checklist.md", import.meta.url),
  decision: new URL("../../docs/live-release-decision.md", import.meta.url),
} as const;

const INTERRUPTION_EVIDENCE_DIGESTS = [
  "27855e9afff031bc49c87bb08bb46ea6ac9a5436e4a2eef9ecb74382e62809b6",
  "a472a031283e5a2ce537801d43a15b2d121241d823397868b81437c50e78bc3d",
  "f35c082c75b37ccbe7e8e5eddf1907e61e66171e13d94dd2c4df50fe3060b62f",
] as const;

describe("live readiness documentation", () => {
  test("records the current implementation audit by pipeline stage", () => {
    const text = readDoc(DOCS.audit);

    for (const stage of [
      "interview",
      "research",
      "deck_plan",
      "design_system",
      "layout_ir",
      "image_generation",
      "revision",
      "report",
    ]) {
      expect(text.includes(stage)).toBe(true);
    }
    expect(text.includes("Top 10 Live gaps")).toBe(true);
    expect(text.includes("Provider factory and stage adapters")).toBe(true);
    expect(text.includes("src/lib/project-list-codec.ts")).toBe(true);
    expect(text.includes("current live evidence/provenance metadata fields")).toBe(true);
  });

  test("documents ticket migration, live benchmark, runbook, manual QA, and release decision", () => {
    const migration = readDoc(DOCS.migration);
    const benchmark = readDoc(DOCS.benchmark);
    const goldenPath = readDoc(DOCS.goldenPath);
    const runbook = readDoc(DOCS.runbook);
    const manualQa = readDoc(DOCS.manualQa);
    const decision = readDoc(DOCS.decision);

    for (const ticketId of [
      "DF-021",
      "DF-022",
      "DF-031",
      "DF-041",
      "DF-041B",
      "DF-050",
      "DF-061",
      "DF-071",
      "DF-092",
      "DF-093",
      "DF-095",
      "DF-101",
      "DF-132",
      "DF-152",
      "DF-153",
    ]) {
      expect(migration.includes(ticketId)).toBe(true);
    }
    expect(benchmark.includes("5 live benchmark scenarios")).toBe(true);
    expect(benchmark.includes("mock_score_contamination")).toBe(true);
    expect(benchmark.includes("missing_output_bundle_manifest")).toBe(true);
    expect(benchmark.includes("output_bundle_golden_path_evidence_missing")).toBe(true);
    expect(benchmark.includes("duplicate_output_bundle_report")).toBe(true);
    expect(benchmark.includes("duplicate_output_bundle_golden_path_report")).toBe(true);
    expect(benchmark.includes("duplicate_output_bundle_screenshot")).toBe(true);
    expect(benchmark.includes("output_bundle_step_screenshot_missing")).toBe(true);
    expect(benchmark.includes("missing_benchmark_package_hash")).toBe(true);
    expect(benchmark.includes("output_bundle_package_mismatch")).toBe(true);
    expect(benchmark.includes("duplicate_output_bundle")).toBe(true);
    expect(benchmark.includes("invalid_failure_domain")).toBe(true);
    expect(benchmark.includes("passed_failure_domain_present")).toBe(true);
    expect(benchmark.includes("live_benchmark_shortfall")).toBe(true);
    expect(benchmark.includes("non-synthetic, non-local `.zip`")).toBe(true);
    expect(goldenPath.includes("parseable `reopenedAt` timestamp")).toBe(true);
    expect(runbook.includes("runtime absence remediation")).toBe(true);
    expect(runbook.includes("DF-245")).toBe(true);
    expect(runbook.includes("missing_package_hash")).toBe(true);
    expect(runbook.includes("missing_native_macos_bundle")).toBe(true);
    expect(runbook.includes("missing_release_trust_evidence")).toBe(true);
    expect(runbook.includes("package_content_contaminated")).toBe(true);
    expect(runbook.includes("missing_clean_machine_step")).toBe(true);
    expect(runbook.includes("10-character uppercase alphanumeric Apple TeamIdentifier")).toBe(true);
    expect(runbook.includes("releaseTrustEvidencePath") && runbook.includes("not set")).toBe(true);
    expect(manualQa.includes("DF-246") && manualQa.includes("sessionEvidencePath")).toBe(true);
    expect(manualQa.includes("10 minutes") && manualQa.includes("setup_over_time")).toBe(true);
    expect(manualQa.includes("tester_not_non_developer")).toBe(true);
    expect(manualQa.includes("missing_manual_qa_session_evidence")).toBe(true);
    expect(
      manualQa.includes("invalid_real_source_url") &&
        manualQa.includes("boundary-whitespace-padded source URLs"),
    ).toBe(true);
    expect(manualQa.includes("invalid_manual_qa_count")).toBe(true);
    expect(manualQa.includes("critical_issue_present")).toBe(true);
    expect(manualQa.includes("placeholder_output_present")).toBe(true);
    expect(manualQa.includes("manual-qa/session-notes-20260619.json")).toBe(true);
    expect(manualQa.includes("severity issue list")).toBe(true);
    expect(manualQa.includes("invalid_manual_qa_issue_log")).toBe(true);
    expect(decision.includes("Release decision: Blocked")).toBe(true);
    expect(decision.includes("docs/live-release-decision.md")).toBe(true);
    expect(decision.includes("canonical release decision path")).toBe(true);
    expect(decision.includes("Golden Path lineage is missing")).toBe(true);
    expect(decision.includes("missing_known_limits")).toBe(true);
    expect(decision.includes("release_decision_blocked")).toBe(true);
    expect(decision.includes("Packaged Live evidence index")).toBe(true);
  });

  test("records the live image path decision contract", () => {
    const imagePathDecision = readDoc(DOCS.imagePathDecision);

    expect(imagePathDecision.includes("DF-230")).toBe(true);
    expect(imagePathDecision.includes("missing_real_image_artifact")).toBe(true);
    expect(imagePathDecision.includes("invalid_image_binary")).toBe(true);
    expect(imagePathDecision.includes("missing_request_model")).toBe(true);
    expect(imagePathDecision.includes("missing_billing_owner")).toBe(true);
    expect(imagePathDecision.includes("missing_required_permissions")).toBe(true);
    expect(imagePathDecision.includes("canonical Codex turn/thread ids")).toBe(true);
    expect(imagePathDecision.includes("padded persisted binary/provenance artifact paths")).toBe(
      true,
    );
    expect(imagePathDecision.includes("requiresCodexImageCapability")).toBe(true);
    expect(imagePathDecision.includes("fixtureFallbackAllowed: false")).toBe(true);
    expect(imagePathDecision.includes("fixture_fallback_enabled")).toBe(true);
    expect(imagePathDecision.includes("missing_image_path_decision")).toBe(true);
    expect(imagePathDecision.includes("image_path_not_locked")).toBe(true);
    expect(imagePathDecision.includes("one real image artifact")).toBe(true);
  });

  test("records the live image artifact storage contract", () => {
    const imageArtifactStorage = readDoc(DOCS.imageArtifactStorage);

    expect(imageArtifactStorage.includes("DF-231")).toBe(true);
    expect(imageArtifactStorage.includes("versioned PNG")).toBe(true);
    expect(imageArtifactStorage.includes("valid PNG signature")).toBe(true);
    expect(imageArtifactStorage.includes("safe storage segment")).toBe(true);
    expect(imageArtifactStorage.includes("positive integers")).toBe(true);
    expect(imageArtifactStorage.includes("mock image artifacts")).toBe(true);
    expect(imageArtifactStorage.includes("64-character SHA-256")).toBe(true);
    expect(imageArtifactStorage.includes("live-image-provider-adapter")).toBe(true);
    expect(imageArtifactStorage.includes("content_policy")).toBe(true);
    expect(imageArtifactStorage.includes("turn id")).toBe(true);
    expect(imageArtifactStorage.includes("canonical provider turn metadata")).toBe(true);
    expect(imageArtifactStorage.includes("trim-only prompt/layout lineage")).toBe(true);
    expect(imageArtifactStorage.includes("invalid latency")).toBe(true);
    expect(imageArtifactStorage.includes("non-finite usage")).toBe(true);
    expect(imageArtifactStorage.includes("provider_contract")).toBe(true);
    expect(imageArtifactStorage.includes("rate_limit")).toBe(true);
  });

  test("records the five-live-background batch contract", () => {
    const backgroundBatch = readDoc(DOCS.backgroundBatch);

    expect(backgroundBatch.includes("DF-232")).toBe(true);
    expect(backgroundBatch.includes("five live background artifacts")).toBe(true);
    expect(backgroundBatch.includes("designSystemId")).toBe(true);
    expect(backgroundBatch.includes("prompt_package_count_mismatch")).toBe(true);
    expect(backgroundBatch.includes("missing_stored_background_artifact")).toBe(true);
    expect(backgroundBatch.includes("stored_background_artifact_mismatch")).toBe(true);
    expect(backgroundBatch.includes("stored metadata/provenance request ids")).toBe(true);
    expect(backgroundBatch.includes("provider provenance sidecar identity fields")).toBe(true);
    expect(backgroundBatch.includes("versioned project image storage path")).toBe(true);
    expect(backgroundBatch.includes("by slide id rather than array order")).toBe(true);
    expect(backgroundBatch.includes("structured text overlay strategy rules")).toBe(true);
    expect(backgroundBatch.includes("invalid_image_binary")).toBe(true);
    expect(backgroundBatch.includes("missing_provider_request_metadata")).toBe(true);
    expect(backgroundBatch.includes("canonical unpadded provider request id")).toBe(true);
    expect(backgroundBatch.includes("retryable")).toBe(true);
  });

  test("records the live image queue controls contract", () => {
    const imageQueueControls = readDoc(DOCS.imageQueueControls);

    expect(imageQueueControls.includes("DF-233")).toBe(true);
    expect(imageQueueControls.includes("rate_limit")).toBe(true);
    expect(imageQueueControls.includes("max-attempt")).toBe(true);
    expect(imageQueueControls.includes("cancellation")).toBe(true);
    expect(imageQueueControls.includes("in-flight cancellation")).toBe(true);
    expect(imageQueueControls.includes("retryProvenance")).toBe(true);
    expect(imageQueueControls.includes("queue_progress_count_mismatch")).toBe(true);
    expect(imageQueueControls.includes("queue_status_count_mismatch")).toBe(true);
    expect(imageQueueControls.includes("missing_concurrency_evidence")).toBe(true);
    expect(imageQueueControls.includes("concurrency_limit_exceeded")).toBe(true);
    expect(imageQueueControls.includes("different bundle or slide")).toBe(true);
    expect(imageQueueControls.includes("retry_delay_history_mismatch")).toBe(true);
    expect(imageQueueControls.includes("cancelled_job_missing_failure")).toBe(true);
    expect(imageQueueControls.includes("partial resume")).toBe(true);
    expect(imageQueueControls.includes("slide_generation@v1")).toBe(true);
    expect(imageQueueControls.includes("stale prompt-lineage")).toBe(true);
    expect(imageQueueControls.includes("stale layout-reference regeneration")).toBe(true);
  });

  test("records the live interruption and recovery matrix contract", () => {
    const interruptionMatrix = readDoc(DOCS.interruptionMatrix);

    expect(interruptionMatrix.includes("DF-243")).toBe(true);
    expect(interruptionMatrix.includes("text_turn_shutdown")).toBe(true);
    expect(interruptionMatrix.includes("image_partial_resume")).toBe(true);
    expect(interruptionMatrix.includes("missing_live_job_evidence")).toBe(true);
    expect(interruptionMatrix.includes("duplicate_interruption_scenario")).toBe(true);
    expect(interruptionMatrix.includes("missing_recovery_snapshot")).toBe(true);
    expect(interruptionMatrix.includes("template, sample, example, or placeholder")).toBe(true);
    expect(interruptionMatrix.includes("live-interruption-template-evidence.test.ts")).toBe(true);
    expect(interruptionMatrix.includes("live-interruption-evidence-identity.test.ts")).toBe(true);
    expect(interruptionMatrix.includes("noncanonical_interruption_evidence_identity")).toBe(true);
    expect(interruptionMatrix.includes("live-interruption-scenario-evidence-path.test.ts")).toBe(
      true,
    );
    expectDocIncludes(interruptionMatrix, "interruption_evidence_path_scenario_mismatch");
    expect(interruptionMatrix.includes("duplicate_recovery_snapshot")).toBe(true);
    expect(interruptionMatrix.includes("missing_cancel_signal_evidence")).toBe(true);
    expect(interruptionMatrix.includes("persisted approval/export gate JSON paths")).toBe(true);
    expect(interruptionMatrix.includes("duplicate_interrupted_gate_evidence")).toBe(true);
    expect(interruptionMatrix.includes("invalid_recovered_job_state")).toBe(true);
    expect(interruptionMatrix.includes("unsafe_recovered_job_state")).toBe(true);
    expect(interruptionMatrix.includes("cancelled_job_still_running")).toBe(true);
    expect(interruptionMatrix.includes("cancelled_job_completed_after_cancel")).toBe(true);
    expect(interruptionMatrix.includes("interrupted_artifact_approvable")).toBe(true);
    expect(interruptionMatrix.includes("live-interruption-closure-evidence.ts")).toBe(true);
    expectDocIncludes(interruptionMatrix, "interruption_closure_artifact_outside_evidence_bundle");
    expect(interruptionMatrix.includes("docs/live-evidence/...")).toBe(true);
    expect(interruptionMatrix.includes("df243-closure-evidence.json")).toBe(true);
    expect(interruptionMatrix.includes("image partial-resume, app cancel snapshot")).toBe(true);
    expect(interruptionMatrix.includes("turn/interrupt")).toBe(true);
    expect(interruptionMatrix.includes("019edc5a-0cc0-7031-915a-5fc6d65c6d86")).toBe(true);
    expect(interruptionMatrix.includes("fetch_shutdown_live_20260619")).toBe(true);
    for (const digest of INTERRUPTION_EVIDENCE_DIGESTS) {
      expectDocIncludes(interruptionMatrix, digest);
    }
  });

  test("records the live usage, latency, retry, and billing display contract", () => {
    const usageSummary = readDoc(DOCS.usageSummary);

    expect(usageSummary.includes("DF-244")).toBe(true);
    expectDocIncludes(usageSummary, "provider, positive observed duration, and retry count");
    expect(usageSummary.includes("unlabelled_estimated_cost")).toBe(true);
    expect(usageSummary.includes("estimated_cost_marked_actual")).toBe(true);
    expect(usageSummary.includes("missing_image_billing_confirmation")).toBe(true);
    expect(usageSummary.includes("confirmationEvidencePath")).toBe(true);
    expect(usageSummary.includes("thread/tokenUsage/updated")).toBe(true);
    expect(usageSummary.includes("019edc53-3bfe-76d3-912d-31769ee3fd3f")).toBe(true);
    expect(usageSummary.includes("input 25006")).toBe(true);
    expect(usageSummary.includes("cost estimate")).toBe(true);
    expect(usageSummary.includes("audit-log.ts")).toBe(true);
  });
});

function readDoc(url: URL): string {
  return readFileSync(url, "utf8");
}

function expectDocIncludes(doc: string, expected: string): void {
  expect(doc.includes(expected)).toBe(true);
}
