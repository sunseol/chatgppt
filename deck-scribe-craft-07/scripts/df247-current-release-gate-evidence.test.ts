import { describe, expect, test } from "bun:test";
import { LIVE_P0_TICKET_IDS } from "../src/lib/live-release-gate";
import {
  PACKAGED_LIVE_EVIDENCE_ISSUE_NUMBERS,
  PACKAGED_LIVE_EVIDENCE_TICKET_IDS,
  type PackagedLiveEvidenceIndex,
  type PackagedLiveEvidenceTicketId,
} from "../src/lib/packaged-live-evidence-index";
import { produceDf247ReleaseGateEvidence } from "./df247-release-gate-evidence-producer";
import {
  buildCurrentDf247ReleaseGateEvidenceInput,
  CURRENT_DF247_OPEN_P0_TICKET_IDS,
  CURRENT_DF247_PACKAGED_INDEX_PATH,
} from "./df247-current-release-gate-evidence";

const PACKAGE_SHA = "e6ed0e25791dd51a1c206247bd0faf5a1010aaee6c7b16e7256dfd25f74f47f6";
const ARTIFACT_SHA = "8e34a90924cd487d5cae9608b51a975e352c53285f5b77bc5b2bbd14cc343267";
const DECISION_SHA = "719f63f024e9e914ee694138257fab95c17e5be0bfca48f38f46c9c70dbb9278";

describe("current DF-247 release gate evidence", () => {
  test("keeps the current open P0 list aligned with the packaged evidence index", () => {
    // Given / When / Then
    expect(CURRENT_DF247_OPEN_P0_TICKET_IDS).toEqual(PACKAGED_LIVE_EVIDENCE_TICKET_IDS);
  });

  test("builds a current blocked release gate input without a cyclic packaged index digest", () => {
    // Given
    const index = blockedPackagedIndex();

    // When
    const input = buildCurrentDf247ReleaseGateEvidenceInput({
      capturedAt: "2026-06-22T10:00:00.000Z",
      packagedLiveEvidenceIndex: index,
      currentEvidenceSha256: [
        {
          path: "docs/live-release-decision.md",
          kind: "canonical release decision",
          sha256: DECISION_SHA,
        },
      ],
    });

    // Then
    expect(input.packageArchiveSha256).toBe(PACKAGE_SHA);
    expect(input.currentEvidence).toContainEqual({
      path: CURRENT_DF247_PACKAGED_INDEX_PATH,
      kind: "shared packaged evidence index",
    });
    expect(input.liveReleaseGate.p0Tickets).toEqual(
      LIVE_P0_TICKET_IDS.map((id) => ({
        id,
        status: CURRENT_DF247_OPEN_P0_TICKET_IDS.includes(id) ? "live_partial" : "verified_live",
      })),
    );
    expect(input.liveReleaseGate.releaseDecision.decision).toBe("blocked");
  });

  test("produces the current DF-247 blockers from generated input", () => {
    // Given
    const input = buildCurrentDf247ReleaseGateEvidenceInput({
      capturedAt: "2026-06-22T10:00:00.000Z",
      packagedLiveEvidenceIndex: blockedPackagedIndex(),
      currentEvidenceSha256: [],
    });

    // When
    const evidence = produceDf247ReleaseGateEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(blockerCodes(evidence)).toEqual([
      "p0_not_live_verified",
      "live_benchmark_shortfall",
      "golden_path_lineage_missing",
      "packaged_live_ticket_blocked",
      "release_decision_blocked",
    ]);
    expect(evidence.missingEvidence).toEqual([
      `p0_not_live_verified:${CURRENT_DF247_OPEN_P0_TICKET_IDS.join(",")}`,
      "live_benchmark_shortfall:DF-242",
      "golden_path_lineage_missing:DF-241",
      `packaged_live_ticket_blocked:${PACKAGED_LIVE_EVIDENCE_TICKET_IDS.join(",")}`,
      "release_decision_blocked:blocked",
    ]);
  });
});

function blockedPackagedIndex(): PackagedLiveEvidenceIndex {
  return {
    path: CURRENT_DF247_PACKAGED_INDEX_PATH,
    packageArchiveSha256: PACKAGE_SHA,
    generatedAt: "2026-06-22T09:00:00.000Z",
    entries: PACKAGED_LIVE_EVIDENCE_TICKET_IDS.map((ticketId) => ({
      ticketId,
      issueNumber: issueNumber(ticketId),
      status: "blocked",
      validationKind: "blocked",
      packageArchiveSha256: PACKAGE_SHA,
      artifactPath: `docs/live-evidence/release/${ticketId.toLowerCase()}-evidence.json`,
      artifactSha256: ARTIFACT_SHA,
    })),
  };
}

function issueNumber(ticketId: PackagedLiveEvidenceTicketId): number {
  return PACKAGED_LIVE_EVIDENCE_ISSUE_NUMBERS[ticketId];
}

function blockerCodes(
  evidence: ReturnType<typeof produceDf247ReleaseGateEvidence>,
): readonly string[] {
  if (evidence.releaseGateResult.kind === "ready") throw new Error("Expected blocked evidence");
  return evidence.releaseGateResult.blockers.map((blocker) => blocker.code);
}
