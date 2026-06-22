import { describe, expect, test } from "bun:test";
import {
  PACKAGED_LIVE_EVIDENCE_TICKET_IDS,
  evaluatePackagedLiveEvidenceIndex,
  type PackagedLiveEvidenceTicketId,
} from "../src/lib/packaged-live-evidence-index";
import {
  PackagedLiveEvidenceIndexProducerError,
  producePackagedLiveEvidenceIndex,
} from "./packaged-live-evidence-index-producer";

const PACKAGE_SHA = "79558b1114d295ddd80fa8068818aeb5bb6b74b4b4b0335981f057824e997163";
const OTHER_PACKAGE_SHA = "1111111111111111111111111111111111111111111111111111111111111111";
const ARTIFACT_SHA = "8e34a90924cd487d5cae9608b51a975e352c53285f5b77bc5b2bbd14cc343267";

describe("packaged live evidence index producer", () => {
  test("builds a canonical release index from packaged child evidence artifacts", () => {
    // Given
    const sources = [...PACKAGED_LIVE_EVIDENCE_TICKET_IDS]
      .reverse()
      .map((ticketId) => childEvidenceSource(ticketId));

    // When
    const index = producePackagedLiveEvidenceIndex({
      generatedAt: "2026-06-22T08:30:00.000Z",
      indexPath: "docs/live-evidence/release/packaged-live-evidence-index.json",
      sources,
    });
    const result = evaluatePackagedLiveEvidenceIndex(index);

    // Then
    expect(index.packageArchiveSha256).toBe(PACKAGE_SHA);
    expect(index.entries.map((entry) => entry.ticketId)).toEqual(PACKAGED_LIVE_EVIDENCE_TICKET_IDS);
    expect(index.entries.find((entry) => entry.ticketId === "DF-245")?.status).toBe("blocked");
    expect(index.entries.find((entry) => entry.ticketId === "DF-245")?.artifactSha256).toBe(
      ARTIFACT_SHA,
    );
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["packaged_live_ticket_blocked"]);
    expect(result.issues[0]?.refs).toEqual(["DF-245", "DF-247"]);
  });

  test("preserves child package mismatches so the release gate can block them", () => {
    // Given
    const sources = PACKAGED_LIVE_EVIDENCE_TICKET_IDS.map((ticketId) =>
      childEvidenceSource(ticketId, {
        packageArchiveSha256: ticketId === "DF-246" ? OTHER_PACKAGE_SHA : PACKAGE_SHA,
      }),
    );

    // When
    const index = producePackagedLiveEvidenceIndex({
      generatedAt: "2026-06-22T08:30:00.000Z",
      indexPath: "docs/live-evidence/release/packaged-live-evidence-index.json",
      sources,
    });
    const result = evaluatePackagedLiveEvidenceIndex(index);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "packaged_live_artifact_package_mismatch",
      "packaged_live_ticket_blocked",
    ]);
    expect(result.issues[0]?.refs).toEqual(["DF-246"]);
  });

  test("rejects missing child evidence before writing an incomplete index", () => {
    // Given
    const sources = PACKAGED_LIVE_EVIDENCE_TICKET_IDS.filter(
      (ticketId) => ticketId !== "DF-247",
    ).map((ticketId) => childEvidenceSource(ticketId));

    // When / Then
    expect(() =>
      producePackagedLiveEvidenceIndex({
        generatedAt: "2026-06-22T08:30:00.000Z",
        indexPath: "docs/live-evidence/release/packaged-live-evidence-index.json",
        sources,
      }),
    ).toThrow(PackagedLiveEvidenceIndexProducerError);
  });
});

function childEvidenceSource(
  ticketId: PackagedLiveEvidenceTicketId,
  patch: Partial<{
    readonly packageArchiveSha256: string;
    readonly status: "ready" | "blocked";
    readonly validationKind: "ready" | "blocked";
  }> = {},
) {
  const blockedByDefault = ticketId === "DF-245" || ticketId === "DF-247";
  return {
    artifactPath: `docs/live-evidence/release/${ticketId.toLowerCase()}-evidence.json`,
    artifactSha256: ARTIFACT_SHA,
    artifactJson: JSON.stringify({
      ticketId,
      issueNumber: issueNumber(ticketId),
      status: blockedByDefault ? "blocked" : "ready",
      validationKind: blockedByDefault ? "blocked" : "ready",
      packageArchiveSha256: PACKAGE_SHA,
      ...patch,
    }),
  };
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
