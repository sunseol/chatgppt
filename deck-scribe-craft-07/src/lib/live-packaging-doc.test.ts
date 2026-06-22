import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOCS = {
  auth: new URL("../../docs/live-auth-secret-lifecycle.md", import.meta.url),
  runbook: new URL("../../docs/production-clean-machine-runbook.md", import.meta.url),
  progress: new URL("../../docs/live-issue-progress.md", import.meta.url),
  decision: new URL("../../docs/live-release-decision.md", import.meta.url),
} as const;

const CURRENT_DRY_RUN_SHA = "33706e7521ea381bb37e992d3a9ca7190bf02d38228ad33334226e57f4a779cc";
const CURRENT_DF245_RECHECK_SHA =
  "09a4abc43a469c77fdd4b5d345a824dd354582ce432f7b60b6759838f12f9f96";

describe("live packaging documentation", () => {
  test("records the current DF-245 dry-run package scan evidence", () => {
    const auth = readDoc(DOCS.auth);
    const runbook = readDoc(DOCS.runbook);
    const progress = readDoc(DOCS.progress);
    const decision = readDoc(DOCS.decision);

    for (const doc of [auth, runbook, progress, decision]) {
      expect(doc.includes(CURRENT_DRY_RUN_SHA)).toBe(true);
    }
    expect(runbook.includes(CURRENT_DF245_RECHECK_SHA)).toBe(true);
    expect(runbook.includes("340,252 bytes")).toBe(true);
    expect(runbook.includes("32 archive members")).toBe(true);
    expect(runbook.includes("OPENAI_API_KEY` string appears only in redaction guard code")).toBe(
      true,
    );
    expect(progress.includes("DF-245 live update")).toBe(true);
    expect(progress.includes("non-synthetic/non-local package archive")).toBe(true);
    expect(progress.includes("canonical clean-machine runbook path evidence")).toBe(true);
    expect(progress.includes("step-specific persisted evidence paths")).toBe(true);
    expect(progress.includes("cross-step")).toBe(true);
    expect(progress.includes("reused-path")).toBe(true);
    expect(progress.includes("one shared evidence path reused for every checklist step")).toBe(
      true,
    );
    expect(runbook.includes("missing_clean_machine_step_evidence")).toBe(true);
    expect(runbook.includes("missing_clean_machine_account_evidence")).toBe(true);
    expect(runbook.includes("one shared evidence path that names every step")).toBe(true);
    expect(runbook.includes("cleanMachineAccountEvidencePath")).toBe(true);
    expect(runbook.includes("macosUsername")).toBe(true);
    expect(runbook.includes("homeDirectory")).toBe(true);
    expect(runbook.includes("macos-account")).toBe(true);
    expect(progress.includes("unsupported-step inflation")).toBe(true);
    expect(progress.includes("valid distinct checklist steps")).toBe(true);
    expect(progress.includes("developer-local package archive")).toBe(true);
    expect(runbook.includes("file://")).toBe(true);
    expect(progress.includes("releaseTrustEvidencePath")).toBe(true);
    expect(progress.includes("generically named persisted `releaseTrustEvidencePath`")).toBe(true);
    expect(progress.includes("boundary whitespace")).toBe(true);
    expect(progress.includes("release-trust bundle")).toBe(true);
    expect(progress.includes("codesign`, `notarytool`, `stapler`, and `spctl` markers")).toBe(true);
    expect(runbook.includes("path identifies a release-trust bundle")).toBe(true);
    expect(runbook.includes("canonical without boundary whitespace")).toBe(true);
    expect(runbook.includes("boundary-whitespace-padded TeamIdentifier values")).toBe(true);
    expect(runbook.includes("generic `macos-release-trust.json` claim")).toBe(true);
    expect(runbook.includes("macos_release_trust")).toBe(true);
    expect(runbook.includes('notarizationStatus: "accepted"')).toBe(true);
    expect(runbook.includes("clean_machine_step")).toBe(true);
    expect(runbook.includes("clean_macos_account")).toBe(true);
    expect(runbook.includes("developerAccount: false")).toBe(true);
    expect(decision.includes("releaseTrustEvidencePath")).toBe(true);
    expect(decision.includes("developer-local persisted `releaseTrustEvidencePath`")).toBe(true);
    expect(decision.includes("non-canonical release-trust path strings")).toBe(true);
    expect(decision.includes("boundary-whitespace-padded Developer ID TeamIdentifier")).toBe(true);
    expect(decision.includes("generic release-trust paths without codesign")).toBe(true);
    expect(decision.includes("production-packaging-evidence-payload.ts")).toBe(true);
    expect(decision.includes("payload-drifted clean-machine step evidence")).toBe(true);
    expect(decision.includes("same `macosUsername` and `homeDirectory`")).toBe(true);
    expect(progress.includes("DF-245 local update: production packaging evidence")).toBe(true);
    expect(progress.includes("structurally incomplete")).toBe(true);
    expect(decision.includes("release-trust evidence paths")).toBe(true);
    expect(decision.includes("clean macOS account evidence")).toBe(true);
    expect(decision.includes("991 tests")).toBe(true);
  });
});

function readDoc(url: URL): string {
  return readFileSync(url, "utf8");
}
