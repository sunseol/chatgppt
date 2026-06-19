import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOCS = {
  textSmoke: new URL("../../docs/live_text_smoke_report.md", import.meta.url),
  projectThreadLifecycle: new URL("../../docs/live-project-thread-lifecycle.md", import.meta.url),
} as const;

describe("live text smoke documentation", () => {
  test("records the live text smoke gate attempt and current remaining blockers", () => {
    const textSmoke = readDoc(DOCS.textSmoke);
    const projectThreadLifecycle = readDoc(DOCS.projectThreadLifecycle);

    for (const needle of [
      "DF-215",
      "codex login status",
      "JSON-RPC `initialize`",
      "codex app-server --stdio",
      "daemon bootstrap returned `bootstrapped`",
      "authenticated health turn",
      "thread/resume",
      "Crash/Restart Evidence",
      "post-restart health turn",
      "evaluateLiveTextSmokeGate",
      "disconnected_text_stage_lineage",
      "text_smoke_prompt_version_mismatch",
      "interview_questions_desktop@v1",
      "layout_ir_desktop@v1",
      "whitespace-padded text artifact/turn reuse rejection",
      "text_artifact_missing_turn_id",
      "missing_resume_next_turn",
      "resume_thread_mismatch",
      "whitespace-padded resume next-turn reuse rejection",
      "resume_reused_existing_turn",
      "resume_non_codex_turn",
      "Smoke result: partial",
    ]) {
      expect(textSmoke.includes(needle)).toBe(true);
    }

    for (const needle of [
      "evaluateProjectThreadResumeEvidence",
      "resume_non_codex_turn",
      "resume_previous_turn_not_recovered",
      "resume_reused_existing_turn",
      "whitespace-padded turn id reuse",
      "missing coordinator thread id",
      "duplicate worker stage",
      "duplicate worker thread ids",
      "coordinator thread id",
      "raw conversation source-of-truth",
      "019edc28-bf27-7380-b7d2-65405e6c6758",
      "packaged desktop restart/reopen run",
    ]) {
      expect(projectThreadLifecycle.includes(needle)).toBe(true);
    }
  });
});

function readDoc(url: URL): string {
  return readFileSync(url, "utf8");
}
