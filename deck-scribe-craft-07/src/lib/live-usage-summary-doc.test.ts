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
    expect(usageSummary.includes("manual QA against the packaged app surface")).toBe(true);

    expect(progress.includes("DF-244 live update")).toBe(true);
    expect(progress.includes("estimatedCostUsd` only as `cost estimate")).toBe(true);
    expect(progress.includes("real image billing/API-key disclosure evidence")).toBe(true);

    expect(decision.includes("ProviderJobProgressPanel.tsx")).toBe(true);
    expect(decision.includes("packaged app-surface usage summary manual QA")).toBe(true);
  });
});

function readDoc(url: URL): string {
  return readFileSync(url, "utf8");
}
