import { describe, expect, test } from "bun:test";
import { buildSplitTicketIssueComments, buildSplitTicketStatusReport } from "./status-report.mjs";

describe("split ticket status report", () => {
  test("formats blocked split release issues without claiming release readiness", () => {
    const report = buildSplitTicketStatusReport({
      schemaVersion: 1,
      status: "blocked",
      checkedAt: "2026-06-25T15:38:09.846Z",
      artifactRoot: ".omx/artifacts/release-evidence-templates-1",
      ticketStatuses: {
        "DF-REL-001": {
          issueNumber: 169,
          state: "blocked",
          reasonCodes: ["dirty_or_unverified_release_artifact"],
        },
        "DF-E2E-112": {
          issueNumber: 170,
          state: "blocked",
          reasonCodes: ["missing_e2e_step", "unsigned_live_e2e_report"],
          evidencePaths: ["packaged-golden-path/verification.json"],
          nextStep: {
            actor: "qa-operator",
            action:
              "Run packaged live Golden Path against the frozen DMG and attach the evidence bundle.",
            closurePolicy: "blocked_do_not_close",
          },
          githubLabels: ["deckforge-e2e-followup", "blocked-do-not-close"],
          verification: {
            rerunCommand:
              "bun scripts/release-evidence-intake.mjs .omx/artifacts/release-evidence-templates-1",
            statusPath: ".omx/artifacts/release-evidence-templates-1/split-ticket-status.json",
          },
        },
        "DF-REL-003": {
          issueNumber: 175,
          state: "blocked",
          reasonCodes: ["qa_status_not_final"],
        },
      },
    });

    expect(report).toContain("# DeckForge Split Release Ticket Status");
    expect(report).toContain("| DF-REL-001 | #169 | blocked |");
    expect(report).toContain("dirty_or_unverified_release_artifact");
    expect(report).toContain("blocked_do_not_close");
    expect(report).toContain("Do not close blocked tickets");
    expect(report).toContain("Artifact root: `.omx/artifacts/release-evidence-templates-1`");
    expect(report).not.toContain("release ready");
  });

  test("marks close candidates while preserving the machine evidence path", () => {
    const report = buildSplitTicketStatusReport({
      schemaVersion: 1,
      status: "ready",
      checkedAt: "2026-06-25T15:38:09.846Z",
      ticketStatuses: {
        "DF-PPT-001": {
          issueNumber: 172,
          state: "close-candidate",
          reasonCodes: [],
          nextStep: {
            actor: "human-reviewer",
            action:
              "Review the linked verification JSON, attach the evidence to the GitHub issue, then close after human review.",
            closurePolicy: "human_review_required",
          },
          githubLabels: ["deckforge-e2e-followup", "human-review-required"],
          verification: {
            rerunCommand:
              "bun scripts/release-evidence-intake.mjs .omx/artifacts/release-evidence-templates-1",
            statusPath: ".omx/artifacts/release-evidence-templates-1/split-ticket-status.json",
          },
        },
      },
    });

    expect(report).toContain("| DF-PPT-001 | #172 | close-candidate | human_review_required |");
    expect(report).toContain("Machine source: `split-ticket-status.json`");
  });

  test("builds per-issue comments that keep blocked tickets open", () => {
    const comments = buildSplitTicketIssueComments({
      schemaVersion: 1,
      status: "blocked",
      checkedAt: "2026-06-25T15:38:09.846Z",
      artifactRoot: ".omx/artifacts/release-evidence-templates-1",
      ticketStatuses: {
        "DF-E2E-112": {
          issueNumber: 170,
          state: "blocked",
          reasonCodes: ["missing_e2e_step", "unsigned_live_e2e_report"],
          evidencePaths: ["packaged-golden-path/verification.json"],
          nextStep: {
            actor: "qa-operator",
            action:
              "Run packaged live Golden Path against the frozen DMG and attach the evidence bundle.",
            closurePolicy: "blocked_do_not_close",
          },
          githubLabels: ["deckforge-e2e-followup", "blocked-do-not-close"],
          verification: {
            rerunCommand:
              "bun scripts/release-evidence-intake.mjs .omx/artifacts/release-evidence-templates-1",
            statusPath: ".omx/artifacts/release-evidence-templates-1/split-ticket-status.json",
          },
        },
        "DF-PPT-001": {
          issueNumber: 172,
          state: "close-candidate",
          reasonCodes: [],
          nextStep: {
            actor: "human-reviewer",
            action:
              "Review the linked verification JSON, attach the evidence to the GitHub issue, then close after human review.",
            closurePolicy: "human_review_required",
          },
          githubLabels: ["deckforge-e2e-followup", "human-review-required"],
          verification: {
            rerunCommand:
              "bun scripts/release-evidence-intake.mjs .omx/artifacts/release-evidence-templates-1",
            statusPath: ".omx/artifacts/release-evidence-templates-1/split-ticket-status.json",
          },
        },
      },
    });

    expect(comments["DF-E2E-112"].issueNumber).toBe(170);
    expect(comments["DF-E2E-112"].body).toContain("Current split-ticket state: `blocked`");
    expect(comments["DF-E2E-112"].body).toContain(
      "`.omx/artifacts/release-evidence-templates-1/split-ticket-status.json`",
    );
    expect(comments["DF-E2E-112"].body).toContain(
      "`.omx/artifacts/release-evidence-templates-1/split-ticket-comments.json`",
    );
    expect(comments["DF-E2E-112"].body).toContain(
      "`.omx/artifacts/release-evidence-templates-1/packaged-golden-path/verification.json`",
    );
    expect(comments["DF-E2E-112"].body).toContain("Closure policy: `blocked_do_not_close`");
    expect(comments["DF-E2E-112"].body).toContain(
      "Expected GitHub labels: `deckforge-e2e-followup`, `blocked-do-not-close`",
    );
    expect(comments["DF-E2E-112"].body).toContain("Next actor: `qa-operator`");
    expect(comments["DF-E2E-112"].body).toContain(
      "Run packaged live Golden Path against the frozen DMG",
    );
    expect(comments["DF-E2E-112"].body).toContain(
      "Rerun command: `bun scripts/release-evidence-intake.mjs .omx/artifacts/release-evidence-templates-1`",
    );
    expect(comments["DF-E2E-112"].body).toContain(
      "Status file: `.omx/artifacts/release-evidence-templates-1/split-ticket-status.json`",
    );
    expect(comments["DF-E2E-112"].body).toContain("Do not close this issue yet.");
    expect(comments["DF-PPT-001"].body).toContain("Current split-ticket state: `close-candidate`");
    expect(comments["DF-PPT-001"].body).toContain("Closure policy: `human_review_required`");
    expect(comments["DF-PPT-001"].body).toContain(
      "Expected GitHub labels: `deckforge-e2e-followup`, `human-review-required`",
    );
    expect(comments["DF-PPT-001"].body).toContain("Review the linked verification JSON");
  });
});
