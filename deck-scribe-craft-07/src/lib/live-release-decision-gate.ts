import { z } from "zod";
import type {
  LiveReleaseBlocker,
  LiveReleaseBlockerCode,
  LiveReleaseDecisionEvidence,
} from "./live-release-gate";

const LiveReleaseDecisionPayloadSchema = z
  .object({
    kind: z.literal("live_release_decision"),
    documentPath: z.string().min(1),
    decision: z.enum(["approved", "blocked"]),
    decisionRecorded: z.boolean(),
    knownLimitsRecorded: z.boolean(),
    capturedAt: z.string().datetime(),
  })
  .strict();

type LiveReleaseDecisionPayload = z.infer<typeof LiveReleaseDecisionPayloadSchema>;

export function decisionBlockers(
  decision: LiveReleaseDecisionEvidence,
): readonly LiveReleaseBlocker[] {
  return [
    ...(hasRecordedDecisionPayload(decision)
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

function hasRecordedDecisionPayload(decision: LiveReleaseDecisionEvidence): boolean {
  const parsed = LiveReleaseDecisionPayloadSchema.safeParse(decision.decisionPayload);
  return (
    decision.documentPath === "docs/live-release-decision.md" &&
    decision.decisionRecorded &&
    parsed.success &&
    decisionPayloadMatchesEvidence(parsed.data, decision)
  );
}

function decisionPayloadMatchesEvidence(
  payload: LiveReleaseDecisionPayload,
  decision: LiveReleaseDecisionEvidence,
): boolean {
  return (
    payload.documentPath === decision.documentPath &&
    payload.decision === decision.decision &&
    payload.decisionRecorded === decision.decisionRecorded &&
    payload.knownLimitsRecorded === decision.knownLimitsRecorded
  );
}

function blocker(
  code: LiveReleaseBlockerCode,
  message: string,
  refs: readonly string[],
): LiveReleaseBlocker {
  return { code, message, refs };
}
