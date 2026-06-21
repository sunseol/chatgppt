const CLOSURE_ISSUE = "#153";
const CLOSURE_TICKET = "DF-243";

export type LiveInterruptionClosureIdentityEvidence = {
  readonly issue: string;
  readonly ticket: string;
};

export type LiveInterruptionClosureIdentityIssueCode =
  | "interruption_closure_issue_mismatch"
  | "interruption_closure_ticket_mismatch";

export type LiveInterruptionClosureIdentityIssue = {
  readonly code: LiveInterruptionClosureIdentityIssueCode;
  readonly message: string;
  readonly refs: readonly string[];
};

export function liveInterruptionClosureIdentityIssues(
  evidence: LiveInterruptionClosureIdentityEvidence,
): readonly LiveInterruptionClosureIdentityIssue[] {
  return [
    ...(evidence.issue === CLOSURE_ISSUE
      ? []
      : [
          issue(
            "interruption_closure_issue_mismatch",
            "DF-243 closure evidence must identify GitHub issue #153.",
            [evidence.issue || "missing"],
          ),
        ]),
    ...(evidence.ticket === CLOSURE_TICKET
      ? []
      : [
          issue(
            "interruption_closure_ticket_mismatch",
            "DF-243 closure evidence must identify ticket DF-243.",
            [evidence.ticket || "missing"],
          ),
        ]),
  ];
}

function issue(
  code: LiveInterruptionClosureIdentityIssueCode,
  message: string,
  refs: readonly string[],
): LiveInterruptionClosureIdentityIssue {
  return { code, message, refs };
}
