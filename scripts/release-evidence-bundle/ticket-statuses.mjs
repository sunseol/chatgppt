import { SPLIT_RELEASE_ISSUES } from "./templates.mjs";

const FINAL_STATUSES = new Set(["release-ready", "accepted"]);
const CLOSE_CANDIDATE_NEXT_STEP = {
  actor: "human-reviewer",
  action:
    "Review the linked verification JSON, attach the evidence to the GitHub issue, then close after human review.",
  closurePolicy: "human_review_required",
};
const BLOCKED_NEXT_STEPS = {
  "DF-REL-001": {
    actor: "release-owner",
    action: "Freeze a clean release candidate artifact identity and rerun intake.",
  },
  "DF-E2E-112": {
    actor: "qa-operator",
    action:
      "Run packaged live Golden Path against the frozen DMG and attach report, screenshots, recording, and final validation bundle.",
  },
  "DF-REL-002": {
    actor: "release-owner",
    action: "Attach signed/notarized clean-machine installation evidence and rerun intake.",
  },
  "DF-PPT-001": {
    actor: "powerpoint-qa-operator",
    action: "Attach real PowerPoint open/edit/save/reopen round-trip files and object graphs.",
  },
  "DF-UAT-001": {
    actor: "non-developer-tester",
    action: "Attach moderated non-developer UAT session artifact and rerun intake.",
  },
  "DF-SEC-001": {
    actor: "release-owner",
    action: "Run secret scan after the final release evidence bundle is complete.",
  },
  "DF-REL-003": {
    actor: "qa-and-release-owner",
    action:
      "Close all blocker tickets, add QA and release-owner sign-off, then rerun final preflight.",
  },
};

export function splitTicketStatuses({
  releaseManifest,
  packagedGoldenPath,
  cleanMachine,
  powerPointRoundTrip,
  nonDeveloperUat,
  secretScan,
  preflight,
}) {
  return {
    "DF-REL-001": statusForReleaseArtifact(releaseManifest),
    "DF-UI-001": statusForEvidenceItem("DF-UI-001", releaseManifest, "uiContract", [
      "gppt-ui-contract/verification.json",
    ]),
    "DF-QA-002": statusForEvidenceItem("DF-QA-002", releaseManifest, "automation", [
      "production-ui-e2e/verification.json",
    ]),
    "DF-QA-003": statusForEvidenceItem("DF-QA-003", releaseManifest, "section45Interactions", [
      "section45/verification.json",
    ]),
    "DF-E2E-112": statusForVerification("DF-E2E-112", packagedGoldenPath, [
      "packaged-golden-path/verification.json",
    ]),
    "DF-UI-040": statusForEvidenceItem("DF-UI-040", releaseManifest, "uiContract", [
      "gppt-ui-contract/verification.json",
    ]),
    "DF-REL-002": statusForVerification("DF-REL-002", cleanMachine, [
      "clean-machine/verification.json",
    ]),
    "DF-PPT-001": statusForVerification("DF-PPT-001", powerPointRoundTrip, [
      "powerpoint-round-trip/verification.json",
    ]),
    "DF-UAT-001": statusForVerification("DF-UAT-001", nonDeveloperUat, [
      "non-developer-uat/verification.json",
    ]),
    "DF-SEC-001": statusForSecretScan(releaseManifest, secretScan),
    "DF-REL-003": withNextStep("DF-REL-003", {
      issueNumber: SPLIT_RELEASE_ISSUES["DF-REL-003"],
      state: preflight.ok ? "close-candidate" : "blocked",
      reasonCodes: preflight.findings.map((finding) => finding.code),
      evidencePaths: ["release-evidence-preflight/verification.json"],
    }),
  };
}

function statusForEvidenceItem(ticket, manifest, evidenceKey, evidencePaths) {
  const item = manifest.evidence?.[evidenceKey] ?? {};
  const passed = item.status === "pass";
  const reasonCodes = [
    ...(passed ? [] : [`${evidenceKey}_evidence_not_passed`]),
    ...(item.path ? [] : [`${evidenceKey}_evidence_path_missing`]),
  ];
  return withNextStep(ticket, {
    issueNumber: SPLIT_RELEASE_ISSUES[ticket],
    state: passed ? "close-candidate" : "blocked",
    reasonCodes,
    evidencePaths,
  });
}

function statusForReleaseArtifact(manifest) {
  const identity = manifest.artifactIdentity ?? {};
  const releaseArtifact = manifest.evidence?.releaseArtifact ?? {};
  const ready = identity.dirtyWorktree === false && releaseArtifact.status === "pass";
  const reasonCodes = [
    ...(identity.dirtyWorktree === false ? [] : ["dirty_worktree_identity"]),
    ...(releaseArtifact.status === "pass" ? [] : ["release_artifact_not_passed"]),
  ];
  return withNextStep("DF-REL-001", {
    issueNumber: SPLIT_RELEASE_ISSUES["DF-REL-001"],
    state: ready ? "close-candidate" : "blocked",
    reasonCodes,
    evidencePaths: ["release-artifact/verification.json"],
  });
}

function statusForVerification(ticket, verification, evidencePaths) {
  return withNextStep(ticket, {
    issueNumber: SPLIT_RELEASE_ISSUES[ticket],
    state: verification.ok ? "close-candidate" : "blocked",
    reasonCodes: verification.findings.map((finding) => finding.code),
    evidencePaths,
  });
}

function statusForSecretScan(manifest, secretScan) {
  const finalBundle = FINAL_STATUSES.has(manifest.qaStatus);
  const ready = finalBundle && secretScan.ok;
  const reasonCodes = [
    ...(finalBundle ? [] : ["qa_status_not_final"]),
    ...secretScan.findings.map((finding) => finding.code),
  ];
  return withNextStep("DF-SEC-001", {
    issueNumber: SPLIT_RELEASE_ISSUES["DF-SEC-001"],
    state: ready ? "close-candidate" : "blocked",
    reasonCodes,
    evidencePaths: ["evidence-secret-scan/verification.json"],
  });
}

function withNextStep(ticket, status) {
  const nextStep = nextStepFor(ticket, status.state);
  return {
    ...status,
    nextStep,
    githubLabels: githubLabelsFor(nextStep.closurePolicy),
  };
}

function nextStepFor(ticket, state) {
  if (state === "close-candidate") return CLOSE_CANDIDATE_NEXT_STEP;
  const blockedStep = BLOCKED_NEXT_STEPS[ticket] ?? {
    actor: "external-evidence-owner",
    action: "Attach missing external evidence and rerun intake gate.",
  };
  return { ...blockedStep, closurePolicy: "blocked_do_not_close" };
}

function githubLabelsFor(closurePolicy) {
  const policyLabel =
    closurePolicy === "human_review_required" ? "human-review-required" : "blocked-do-not-close";
  return ["deckforge-e2e-followup", policyLabel];
}
