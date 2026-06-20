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
    expect(usageSummary.includes("ProviderJobProgressPanel.integration.test.tsx")).toBe(true);
    expect(usageSummary.includes("cost estimate $0.0400")).toBe(true);
    expect(usageSummary.includes("API key billing confirmed")).toBe(true);
    expect(usageSummary.includes("API key billing not confirmed")).toBe(true);
    expect(usageSummary.includes("even when `apiKeyRequired: false`")).toBe(true);
    expect(usageSummary.includes("confirmationEvidencePath")).toBe(true);
    expect(
      usageSummary.includes("secret-like text inside displayed image billing disclosure labels"),
    ).toBe(true);
    expect(usageSummary.includes("live-usage-summary-redaction.test.ts")).toBe(true);
    expect(usageSummary.includes("provider-job-progress-view-redaction.test.ts")).toBe(true);
    expect(usageSummary.includes("developer-local")).toBe(true);
    expect(usageSummary.includes("incomplete_text_token_usage")).toBe(true);
    expect(usageSummary.includes("missing_image_usage_count")).toBe(true);
    expect(usageSummary.includes("missing_usage_stage_identity")).toBe(true);
    expect(usageSummary.includes("duplicate_usage_stage_identity")).toBe(true);
    expect(usageSummary.includes("invalid_usage_provider_kind")).toBe(true);
    expect(usageSummary.includes("live-usage-summary-stage-identity.test.ts")).toBe(true);
    expect(usageSummary.includes("invalid_cost_label")).toBe(true);
    expect(usageSummary.includes("live-usage-summary-cost-label.test.ts")).toBe(true);
    expect(usageSummary.includes("manual QA against the packaged app surface")).toBe(true);

    expect(progress.includes("DF-244 live update")).toBe(true);
    expect(progress.includes("estimatedCostUsd` only as `cost estimate")).toBe(true);
    expect(progress.includes("confirmationEvidencePath")).toBe(true);
    expect(progress.includes("non-local")).toBe(true);
    expect(progress.includes("blank or duplicated stage ids")).toBe(true);
    expect(progress.includes("provider kinds outside the DeckForge taxonomy")).toBe(true);
    expect(progress.includes("unsupported runtime cost labels")).toBe(true);
    expect(progress.includes("real provider image billing/API-key disclosure payloads")).toBe(true);

    expect(decision.includes("ProviderJobProgressPanel.tsx")).toBe(true);
    expect(decision.includes("confirmationEvidencePath")).toBe(true);
    expect(decision.includes("duplicated usage stage ids")).toBe(true);
    expect(decision.includes("unsupported runtime provider kinds")).toBe(true);
    expect(decision.includes("developer-local")).toBe(true);
    expect(decision.includes("packaged app-surface usage summary manual QA")).toBe(true);
    expect(decision.includes("real provider image billing/API key payloads")).toBe(true);
  });
});

function readDoc(url: URL): string {
  return readFileSync(url, "utf8");
}
