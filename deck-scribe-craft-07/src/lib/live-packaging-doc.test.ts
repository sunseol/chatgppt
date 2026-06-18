import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOCS = {
  auth: new URL("../../docs/live-auth-secret-lifecycle.md", import.meta.url),
  runbook: new URL("../../docs/production-clean-machine-runbook.md", import.meta.url),
  progress: new URL("../../docs/live-issue-progress.md", import.meta.url),
  decision: new URL("../../docs/live-release-decision.md", import.meta.url),
} as const;

const CURRENT_DRY_RUN_SHA = "377df1eabfc41128c08d24f6c00a40b2f80dac01ccd7f4fc90e810f16924d20e";

describe("live packaging documentation", () => {
  test("records the current DF-245 dry-run package scan evidence", () => {
    const auth = readDoc(DOCS.auth);
    const runbook = readDoc(DOCS.runbook);
    const progress = readDoc(DOCS.progress);
    const decision = readDoc(DOCS.decision);

    for (const doc of [auth, runbook, progress, decision]) {
      expect(doc.includes(CURRENT_DRY_RUN_SHA)).toBe(true);
    }
    expect(runbook.includes("281,804 bytes compressed")).toBe(true);
    expect(runbook.includes("26 archive members")).toBe(true);
    expect(runbook.includes("OPENAI_API_KEY` string appears only in redaction guard code")).toBe(
      true,
    );
    expect(progress.includes("DF-245 live update")).toBe(true);
    expect(decision.includes("629 tests")).toBe(true);
  });
});

function readDoc(url: URL): string {
  return readFileSync(url, "utf8");
}
