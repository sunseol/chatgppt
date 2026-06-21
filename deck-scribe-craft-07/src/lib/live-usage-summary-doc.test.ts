import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOCS = {
  usageSummary: new URL("../../docs/live-usage-summary.md", import.meta.url),
  progress: new URL("../../docs/live-issue-progress.md", import.meta.url),
  decision: new URL("../../docs/live-release-decision.md", import.meta.url),
} as const;

describe("live usage summary documentation", () => {
  test("records the DF-244 app-surface usage display contract", () => {
    const usageSummary = readDoc(DOCS.usageSummary);
    const progress = readDoc(DOCS.progress);
    const decision = readDoc(DOCS.decision);

    expect(usageSummary.includes("App Surface Usage Display")).toBe(true);
    expect(usageSummary.includes("App Server Rich Usage Preservation")).toBe(true);
    expect(usageSummary.includes("ProviderJobProgressPanel.integration.test.tsx")).toBe(true);
    expect(usageSummary.includes("usageSummary")).toBe(true);
    expect(usageSummary.includes("imageBillingDisclosure")).toBe(true);
    expect(usageSummary.includes("estimatedCostUsd")).toBe(true);
    expect(usageSummary.includes("Malformed supplied numeric usage or cost fields")).toBe(true);
    expect(usageSummary.includes("`costLabel` to `estimate`")).toBe(true);
    expect(usageSummary.includes("missing_provider_usage_summary")).toBe(true);
    expect(usageSummary.includes("invalid_cost_amount")).toBe(true);
    expect(usageSummary.includes("cost estimate $0.0400")).toBe(true);
    expect(usageSummary.includes("Codex image usage confirmed")).toBe(true);
    expect(usageSummary.includes("Codex image usage not confirmed")).toBe(true);
    expect(usageSummary.includes("apiKeyRequired: false")).toBe(true);
    expect(usageSummary.includes("API-key-required confirmation blockers")).toBe(true);
    expect(usageSummary.includes("confirmationEvidencePath")).toBe(true);
    expect(usageSummary.includes("image-billing-confirmation.json")).toBe(true);
    expect(usageSummary.includes('bare `stageId: "generate"` is not sufficient')).toBe(true);
    expect(usageSummary.includes("non-image generate-stage regression")).toBe(true);
    expect(usageSummary.includes("boundary-whitespace-padded")).toBe(true);
    expect(usageSummary.includes("fallback `unknown` project/job")).toBe(true);
    expect(usageSummary.includes("template/sample/example/placeholder")).toBe(true);
    expect(usageSummary.includes("generic confirmation JSON filenames")).toBe(true);
    expect(usageSummary.includes("live-usage-billing-evidence-identity.test.ts")).toBe(true);
    expect(usageSummary.includes("live-usage-billing-same-job.test.ts")).toBe(true);
    expect(usageSummary.includes("live-usage-billing-evidence.ts")).toBe(true);
    expect(usageSummary.includes("formatted summaries")).toBe(true);
    expect(
      usageSummary.includes(
        "confirmed image usage disclosure labels only when persisted confirmation evidence is valid",
      ),
    ).toBe(true);
    expect(usageSummary.includes("API-key-required, or evidence-less")).toBe(true);
    expect(
      usageSummary.includes("secret-like text inside displayed image usage disclosure labels"),
    ).toBe(true);
    expect(usageSummary.includes("live-usage-summary-redaction.test.ts")).toBe(true);
    expect(usageSummary.includes("provider-job-progress-view-redaction.test.ts")).toBe(true);
    expect(usageSummary.includes("developer-local")).toBe(true);
    expect(usageSummary.includes("incomplete_text_token_usage")).toBe(true);
    expect(usageSummary.includes("missing_image_usage_count")).toBe(true);
    expect(usageSummary.includes("missing_usage_stage_identity")).toBe(true);
    expect(usageSummary.includes("noncanonical_usage_stage_identity")).toBe(true);
    expect(usageSummary.includes("duplicate_usage_stage_identity")).toBe(true);
    expect(usageSummary.includes("invalid_usage_provider_kind")).toBe(true);
    expect(usageSummary.includes("live-usage-summary-stage-identity.test.ts")).toBe(true);
    expect(usageSummary.includes("live-usage-summary-duration-evidence.test.ts")).toBe(true);
    expect(usageSummary.includes("zero-duration latency evidence blockers")).toBe(true);
    expect(usageSummary.includes("invalid_cost_label")).toBe(true);
    expect(usageSummary.includes("live-usage-summary-cost-label.test.ts")).toBe(true);
    expect(usageSummary.includes("manual QA against the packaged app surface")).toBe(true);

    expect(progress.includes("DF-244 live update")).toBe(true);
    expect(progress.includes("DF-244 Malformed App Server Usage Gate")).toBe(true);
    expect(progress.includes("DF-244 Positive Duration Evidence Gate")).toBe(true);
    expect(progress.includes("DF-244 App Server rich usage update")).toBe(true);
    expect(progress.includes("malformed supplied numeric usage and cost fields")).toBe(true);
    expect(progress.includes("thread/tokenUsage/updated")).toBe(true);
    expect(progress.includes("imageBillingDisclosure.confirmationEvidencePath")).toBe(true);
    expect(progress.includes("estimatedCostUsd` only as `cost estimate")).toBe(true);
    expect(progress.includes("`costLabel` to `estimate`")).toBe(true);
    expect(progress.includes("confirmationEvidencePath")).toBe(true);
    expect(progress.includes("non-local")).toBe(true);
    expect(progress.includes("blank, padded, or duplicated stage ids")).toBe(true);
    expect(progress.includes("provider kinds outside the DeckForge taxonomy")).toBe(true);
    expect(progress.includes("unsupported runtime cost labels")).toBe(true);
    expect(progress.includes("usage/image-billing-template.json")).toBe(true);
    expect(progress.includes("usage/generic-confirmation.json")).toBe(true);
    expect(progress.includes("boundary whitespace")).toBe(true);
    expect(progress.includes("fallback")).toBe(true);
    expect(progress.includes("usage/unknown/unknown/image-billing-confirmation.json")).toBe(true);
    expect(progress.includes("missing_image_billing_confirmation")).toBe(true);
    expect(progress.includes("current provider job id")).toBe(true);
    expect(progress.includes("confirmed-looking audit payload without valid")).toBe(true);
    expect(progress.includes("real provider image Codex usage disclosure payloads")).toBe(true);
    expect(progress.includes("apiKeyRequired: true")).toBe(true);

    expect(decision.includes("ProviderJobProgressPanel.tsx")).toBe(true);
    expect(decision.includes("malformed supplied numeric usage/cost fields")).toBe(true);
    expect(decision.includes("confirmationEvidencePath")).toBe(true);
    expect(decision.includes("template/sample/example/placeholder")).toBe(true);
    expect(decision.includes("boundary-whitespace-padded")).toBe(true);
    expect(decision.includes("fallback `unknown` project/job")).toBe(true);
    expect(decision.includes("generic/non-canonical Codex image usage status")).toBe(true);
    expect(decision.includes("wrong-job confirmation status")).toBe(true);
    expect(decision.includes("image-billing-confirmation.json")).toBe(true);
    expect(decision.includes("apiKeyRequired: false")).toBe(true);
    expect(
      decision.includes("evidence-less or API-key-required confirmed-looking image usage"),
    ).toBe(true);
    expect(decision.includes("formatted summaries")).toBe(true);
    expect(decision.includes("non-canonical, or duplicated usage stage ids")).toBe(true);
    expect(decision.includes("unsupported runtime provider kinds")).toBe(true);
    expect(decision.includes("zero-duration or otherwise invalid duration/retry data")).toBe(true);
    expect(decision.includes("developer-local")).toBe(true);
    expect(decision.includes("packaged app-surface usage summary manual QA")).toBe(true);
    expect(decision.includes("real provider image Codex usage payloads")).toBe(true);
  });
});

function readDoc(url: URL): string {
  return readFileSync(url, "utf8");
}
