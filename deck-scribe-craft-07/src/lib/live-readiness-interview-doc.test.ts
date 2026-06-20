import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const INTERVIEW_CUTOVER_DOC = new URL("../../docs/live-interview-cutover.md", import.meta.url);

describe("live interview readiness documentation", () => {
  test("records the live interview cutover contract", () => {
    const text = readFileSync(INTERVIEW_CUTOVER_DOC, "utf8");

    expect(text.includes("DF-213")).toBe(true);
    expect(text.includes("interview_follow_up@v1")).toBe(true);
    expect(text.includes("non_codex_session_auth")).toBe(true);
    expect(text.includes("brief_missing_question_input")).toBe(true);
    expect(text.includes("brief_missing_answer_input")).toBe(true);
    expect(text.includes("brief_reused_question_turn")).toBe(true);
    expect(text.includes("brief_reused_question_artifact")).toBe(true);
    expect(text.includes("noncanonical_interview_identity")).toBe(true);
    expect(text.includes("noncanonical_interview_input_identity")).toBe(true);
    expect(text.includes("invalid_follow_up_question")).toBe(true);
    expect(text.includes("interview_prompt_version_mismatch")).toBe(true);
    expect(text.includes("interview_questions_desktop@v1")).toBe(true);
    expect(text.includes("live-interview-follow-up-question.test.ts")).toBe(true);
    expect(
      text.includes("ready Brief patch together with the question and Brief live artifact records"),
    ).toBe(true);
    expect(text.includes("desktop-live-interview-artifact-patch.test.ts")).toBe(true);
  });
});
