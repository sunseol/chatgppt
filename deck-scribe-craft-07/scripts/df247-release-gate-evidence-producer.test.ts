import { describe, expect, test } from "bun:test";
import {
  PACKAGED_LIVE_EVIDENCE_TICKET_IDS,
  type PackagedLiveEvidenceIndex,
  type PackagedLiveEvidenceTicketId,
} from "../src/lib/packaged-live-evidence-index";
import { readyLiveReleaseGateInput } from "../src/lib/live-release-gate-test-fixtures";
import {
  parseDf247ReleaseGateEvidenceInput,
  parseDf247ReleaseGateEvidenceJson,
} from "./df247-release-gate-evidence-schema";
import { produceDf247ReleaseGateEvidence } from "./df247-release-gate-evidence-producer";

const PACKAGE_SHA = "bdb64f343b721a435889377d6449d18d537fe27a11ac41be343c481c483688ee";
const ARTIFACT_SHA = "8e34a90924cd487d5cae9608b51a975e352c53285f5b77bc5b2bbd14cc343267";

type ReleaseGateEvidencePatch = Partial<
  Omit<ReturnType<typeof readyLiveReleaseGateInput>, "packagedLiveEvidenceIndex">
>;

describe("DF-247 release gate evidence producer", () => {
  test("produces ready DF-247 evidence when every release gate is ready", () => {
    // Given
    const input = releaseGateEvidenceInput(readyPackagedIndex());

    // When
    const evidence = produceDf247ReleaseGateEvidence(input);

    // Then
    expect(evidence.ticketId).toBe("DF-247");
    expect(evidence.status).toBe("ready");
    expect(evidence.validationKind).toBe("ready");
    expect(evidence.releaseGateResult.kind).toBe("ready");
    expect(evidence.missingEvidence).toEqual([]);
  });

  test("keeps DF-247 evidence blocked with release gate blockers intact", () => {
    // Given
    const readyGate = readyLiveReleaseGateInput();
    const input = releaseGateEvidenceInput(blockedPackagedIndex(), {
      releaseDecision: {
        ...readyGate.releaseDecision,
        decision: "blocked",
        decisionPayload: {
          kind: "live_release_decision",
          documentPath: "docs/live-release-decision.md",
          decision: "blocked",
          decisionRecorded: true,
          knownLimitsRecorded: true,
          capturedAt: "2026-06-22T09:30:00.000Z",
        },
      },
    });

    // When
    const evidence = produceDf247ReleaseGateEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.validationKind).toBe("blocked");
    expect(evidence.releaseGateResult.kind).toBe("blocked");
    if (evidence.releaseGateResult.kind !== "blocked") return;
    expect(evidence.releaseGateResult.blockers.map((blocker) => blocker.code)).toEqual([
      "packaged_live_ticket_blocked",
      "release_decision_blocked",
    ]);
    expect(evidence.missingEvidence).toEqual([
      "packaged_live_ticket_blocked:DF-245,DF-247",
      "release_decision_blocked:blocked",
    ]);
  });

  test("rejects malformed release gate input at the boundary", () => {
    // Given
    const input = releaseGateEvidenceInput(readyPackagedIndex());

    // When / Then
    expect(() =>
      parseDf247ReleaseGateEvidenceInput({
        ...input,
        liveReleaseGate: {
          ...input.liveReleaseGate,
          criticalDefectCount: -1,
        },
      }),
    ).toThrow();
    expect(() => parseDf247ReleaseGateEvidenceJson("{not-json")).toThrow();
  });
});

function releaseGateEvidenceInput(
  packagedLiveEvidenceIndex: PackagedLiveEvidenceIndex,
  patch: ReleaseGateEvidencePatch = {},
) {
  const readyGate = readyLiveReleaseGateInput();
  return parseDf247ReleaseGateEvidenceInput({
    capturedAt: "2026-06-22T09:30:00.000Z",
    packageArchiveSha256: PACKAGE_SHA,
    packagedLiveEvidenceIndex,
    liveReleaseGate: {
      p0Tickets: readyGate.p0Tickets,
      productionPackage: readyGate.productionPackage,
      liveBenchmarks: readyGate.liveBenchmarks,
      goldenPathLineage: readyGate.goldenPathLineage,
      goldenPathFinalExportArtifactId: readyGate.goldenPathFinalExportArtifactId,
      criticalDefectCount: readyGate.criticalDefectCount,
      unresolvedP1Risks: readyGate.unresolvedP1Risks,
      releaseDecision: readyGate.releaseDecision,
      ...patch,
    },
    currentEvidence: [
      {
        path: "docs/live-release-decision.md",
        kind: "canonical release decision",
      },
      {
        path: "docs/live-evidence/release/packaged-live-evidence-index.json",
        sha256: ARTIFACT_SHA,
        kind: "shared packaged evidence index",
      },
    ],
  });
}

function readyPackagedIndex(): PackagedLiveEvidenceIndex {
  return packagedIndex("ready");
}

function blockedPackagedIndex(): PackagedLiveEvidenceIndex {
  return packagedIndex("blocked");
}

function packagedIndex(status: "ready" | "blocked"): PackagedLiveEvidenceIndex {
  return {
    path: "docs/live-evidence/release/packaged-live-evidence-index.json",
    packageArchiveSha256: PACKAGE_SHA,
    generatedAt: "2026-06-22T09:30:00.000Z",
    entries: PACKAGED_LIVE_EVIDENCE_TICKET_IDS.map((ticketId) => ({
      ticketId,
      issueNumber: issueNumber(ticketId),
      status: status === "blocked" && isStillBlocked(ticketId) ? "blocked" : "ready",
      validationKind: status === "blocked" && isStillBlocked(ticketId) ? "blocked" : "ready",
      packageArchiveSha256: PACKAGE_SHA,
      artifactPath: `docs/live-evidence/release/${ticketId.toLowerCase()}-evidence.json`,
      artifactSha256: ARTIFACT_SHA,
    })),
  };
}

function isStillBlocked(ticketId: PackagedLiveEvidenceTicketId): boolean {
  return ticketId === "DF-245" || ticketId === "DF-247";
}

function issueNumber(ticketId: PackagedLiveEvidenceTicketId): number {
  return {
    "DF-205": 131,
    "DF-233": 147,
    "DF-235": 149,
    "DF-241": 151,
    "DF-242": 152,
    "DF-243": 153,
    "DF-244": 154,
    "DF-245": 155,
    "DF-246": 156,
    "DF-247": 157,
  }[ticketId];
}
