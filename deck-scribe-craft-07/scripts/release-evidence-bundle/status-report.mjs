export function buildSplitTicketStatusReport(statusDocument) {
  const rows = Object.entries(statusDocument.ticketStatuses ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([ticket, status]) => ticketRow(ticket, status));
  return [
    "# DeckForge Split Release Ticket Status",
    "",
    `Overall status: \`${statusDocument.status ?? "unknown"}\``,
    `Checked at: \`${statusDocument.checkedAt ?? "unknown"}\``,
    "Machine source: `split-ticket-status.json`",
    `Artifact root: \`${statusDocument.artifactRoot ?? "."}\``,
    "",
    "| Ticket | Issue | State | Closure policy | Reason codes | Next action |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "Do not close blocked tickets. Close only `close-candidate` tickets after reviewing the linked verification JSON and attaching the evidence to the GitHub issue.",
    "",
  ].join("\n");
}

export function buildSplitTicketIssueComments(statusDocument) {
  return Object.fromEntries(
    Object.entries(statusDocument.ticketStatuses ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([ticket, status]) => [ticket, issueComment(ticket, statusDocument, status)]),
  );
}

function ticketRow(ticket, status) {
  const nextStep = nextStepForStatus(status);
  return [
    ticket,
    `#${status.issueNumber ?? "unknown"}`,
    status.state ?? "unknown",
    nextStep.closurePolicy,
    reasonSummary(status.reasonCodes ?? []),
    nextStep.action,
  ]
    .map((value) => ` ${value} `)
    .join("|")
    .replace(/^/, "|")
    .replace(/$/, "|");
}

function issueComment(ticket, statusDocument, status) {
  const blocked = status.state !== "close-candidate";
  const artifactRoot = statusDocument.artifactRoot ?? ".";
  const nextStep = nextStepForStatus(status);
  return {
    issueNumber: status.issueNumber,
    body: [
      "## Split-ticket machine status",
      "",
      `Ticket: \`${ticket}\``,
      `Current split-ticket state: \`${status.state ?? "unknown"}\``,
      `Overall release split status: \`${statusDocument.status ?? "unknown"}\``,
      `Checked at: \`${statusDocument.checkedAt ?? "unknown"}\``,
      "",
      "Machine artifacts:",
      `- \`${artifactPath(artifactRoot, "split-ticket-status.json")}\``,
      `- \`${artifactPath(artifactRoot, "split-ticket-status.md")}\``,
      `- \`${artifactPath(artifactRoot, "split-ticket-comments.json")}\``,
      ...evidencePathLines(artifactRoot, status.evidencePaths ?? []),
      "",
      `Reason codes: ${reasonSummary(status.reasonCodes ?? [])}`,
      `Closure policy: \`${nextStep.closurePolicy}\``,
      `Expected GitHub labels: ${labelSummary(status.githubLabels ?? [])}`,
      `Next actor: \`${nextStep.actor}\``,
      `Next action: ${nextStep.action}`,
      ...verificationLines(status.verification),
      "",
      blocked
        ? "Do not close this issue yet. Attach the missing external evidence and rerun the intake gate."
        : "Review the linked verification JSON, attach the evidence to this issue, then close only after human review.",
      "",
    ].join("\n"),
  };
}

function verificationLines(verification) {
  if (!verification) return [];
  return [
    `Rerun command: \`${verification.rerunCommand}\``,
    `Status file: \`${verification.statusPath}\``,
  ];
}

function nextStepForStatus(status) {
  if (status.nextStep) return status.nextStep;
  if (status.state === "close-candidate") {
    return {
      actor: "human-reviewer",
      action:
        "Review the linked verification JSON, attach the evidence to the GitHub issue, then close after human review.",
      closurePolicy: "human_review_required",
    };
  }
  return {
    actor: "external-evidence-owner",
    action: "Attach missing external evidence and rerun intake gate.",
    closurePolicy: "blocked_do_not_close",
  };
}

function evidencePathLines(root, evidencePaths) {
  if (evidencePaths.length === 0) return [];
  return [
    "",
    "Evidence files:",
    ...evidencePaths.map((filePath) => `- \`${artifactPath(root, filePath)}\``),
  ];
}

function artifactPath(root, fileName) {
  if (root === "." || root === "") return fileName;
  return `${root.replace(/\/$/, "")}/${fileName}`;
}

function reasonSummary(reasonCodes) {
  if (reasonCodes.length === 0) return "none";
  const uniqueCodes = [...new Set(reasonCodes)];
  const visible = uniqueCodes.slice(0, 8).join(", ");
  return uniqueCodes.length > 8 ? `${visible}, ...` : visible;
}

function labelSummary(labels) {
  if (labels.length === 0) return "none";
  return [...new Set(labels)].map((label) => `\`${label}\``).join(", ");
}
