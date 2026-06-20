import type {
  LiveReleaseBlocker,
  LiveReleaseBlockerCode,
  LiveReleaseDecisionEvidence,
} from "./live-release-gate";

export function decisionBlockers(
  decision: LiveReleaseDecisionEvidence,
): readonly LiveReleaseBlocker[] {
  return [
    ...(decision.documentPath === "docs/live-release-decision.md" && decision.decisionRecorded
      ? []
      : [
          blocker(
            "missing_release_decision",
            "Release decision must be recorded in docs/live-release-decision.md.",
            [decision.documentPath || "docs/live-release-decision.md"],
          ),
        ]),
    ...(decision.decision === "approved"
      ? []
      : [
          blocker(
            "release_decision_blocked",
            "Release decision must explicitly approve the Live Initial Version.",
            [decision.decision],
          ),
        ]),
    ...(decision.knownLimitsRecorded
      ? []
      : [
          blocker(
            "missing_known_limits",
            "Known release limits must be recorded in the release decision document.",
            ["Known limits"],
          ),
        ]),
  ];
}

function blocker(
  code: LiveReleaseBlockerCode,
  message: string,
  refs: readonly string[],
): LiveReleaseBlocker {
  return { code, message, refs };
}
