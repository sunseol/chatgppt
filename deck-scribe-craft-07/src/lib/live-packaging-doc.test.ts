import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOCS = {
  auth: new URL("../../docs/live-auth-secret-lifecycle.md", import.meta.url),
  runbook: new URL("../../docs/production-clean-machine-runbook.md", import.meta.url),
  progress: new URL("../../docs/live-issue-progress.md", import.meta.url),
  decision: new URL("../../docs/live-release-decision.md", import.meta.url),
} as const;

const CURRENT_DRY_RUN_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";

describe("live packaging documentation", () => {
  test("records the current DF-245 dry-run package scan evidence", () => {
    const auth = readDoc(DOCS.auth);
    const runbook = readDoc(DOCS.runbook);
    const progress = readDoc(DOCS.progress);
    const decision = readDoc(DOCS.decision);

    for (const doc of [auth, runbook, progress, decision]) {
      expect(doc.includes(CURRENT_DRY_RUN_SHA)).toBe(true);
    }
    expect(runbook.includes("284,517 bytes compressed")).toBe(true);
    expect(runbook.includes("26 archive members")).toBe(true);
    expect(runbook.includes("OPENAI_API_KEY` string appears only in redaction guard code")).toBe(
      true,
    );
    expect(progress.includes("DF-245 live update")).toBe(true);
    expect(progress.includes("non-synthetic/non-local package archive")).toBe(true);
    expect(progress.includes("canonical clean-machine runbook path evidence")).toBe(true);
    expect(progress.includes("unsupported-step inflation")).toBe(true);
    expect(progress.includes("valid distinct checklist steps")).toBe(true);
    expect(progress.includes("developer-local package archive")).toBe(true);
    expect(runbook.includes("file://")).toBe(true);
    expect(progress.includes("releaseTrustEvidencePath")).toBe(true);
    expect(progress.includes("generically named persisted `releaseTrustEvidencePath`")).toBe(true);
    expect(progress.includes("release-trust bundle")).toBe(true);
    expect(runbook.includes("path identifies a release-trust bundle")).toBe(true);
    expect(decision.includes("releaseTrustEvidencePath")).toBe(true);
    expect(decision.includes("developer-local persisted `releaseTrustEvidencePath`")).toBe(true);
    expect(decision.includes("release-trust evidence paths")).toBe(true);
    expect(decision.includes("894 tests")).toBe(true);
  });
});

function readDoc(url: URL): string {
  return readFileSync(url, "utf8");
}
