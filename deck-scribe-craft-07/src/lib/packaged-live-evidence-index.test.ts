import { describe, expect, test } from "bun:test";
import {
  PACKAGED_LIVE_EVIDENCE_TICKET_IDS,
  evaluatePackagedLiveEvidenceIndex,
  formatPackagedLiveEvidenceIndexSummary,
  type PackagedLiveEvidenceIndex,
  type PackagedLiveEvidenceTicketId,
} from "./packaged-live-evidence-index";

const PACKAGE_SHA = "83032811d035f19bc7ac6d1837f137d535e011334197e6b18ae8f9477e342df7";
const EVIDENCE_SHA = "cec0077d117f8cc2d863db2075bbbd55cc812830e91233474a9f550ee6de427b";

describe("packaged live evidence index", () => {
  test("passes when every packaged release evidence ticket has a matching JSON artifact", () => {
    const index = completeIndex();

    const result = evaluatePackagedLiveEvidenceIndex(index);
    const summary = formatPackagedLiveEvidenceIndexSummary(index);

    expect(result).toEqual({ kind: "ready" });
    expect(summary.includes("Packaged Live Evidence Index")).toBe(true);
    expect(summary.includes("Ready tickets: 6 of 6")).toBe(true);
  });

  test("blocks missing duplicate and mismatched ticket evidence entries", () => {
    const duplicate = entry("DF-241");
    const index = completeIndex({
      entries: [
        duplicate,
        { ...duplicate, artifactPath: "docs/live-evidence/release/df241-copy.json" },
        { ...entry("DF-242"), issueNumber: 151 },
        { ...entry("DF-243"), artifactPath: "docs/live-evidence/release/df241-wrong.json" },
        { ...entry("DF-245"), artifactSha256: "not-a-sha" },
        { ...entry("DF-247"), artifactPath: " docs/live-evidence/release/df247-gate.json " },
      ],
    });

    const result = evaluatePackagedLiveEvidenceIndex(index);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_packaged_live_ticket",
      "duplicate_packaged_live_ticket",
      "packaged_live_ticket_issue_mismatch",
      "packaged_live_ticket_path_mismatch",
      "noncanonical_packaged_live_artifact_path",
      "invalid_packaged_live_artifact_hash",
    ]);
  });

  test("blocks ready claims when child validation or release dependencies are blocked", () => {
    const index = completeIndex({
      entries: PACKAGED_LIVE_EVIDENCE_TICKET_IDS.map((ticketId) =>
        ticketId === "DF-243"
          ? { ...entry(ticketId), status: "ready", validationKind: "blocked" }
          : entry(ticketId),
      ),
    });

    const result = evaluatePackagedLiveEvidenceIndex(index);

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "packaged_live_ready_validation_blocked",
      "packaged_live_release_ready_before_upstream",
    ]);
  });
});

function completeIndex(patch: Partial<PackagedLiveEvidenceIndex> = {}): PackagedLiveEvidenceIndex {
  return {
    path: "docs/live-evidence/release/packaged-live-evidence-index.json",
    packageArchiveSha256: PACKAGE_SHA,
    generatedAt: "2026-06-21T08:30:00.000Z",
    entries: PACKAGED_LIVE_EVIDENCE_TICKET_IDS.map(entry),
    ...patch,
  };
}

function entry(ticketId: PackagedLiveEvidenceTicketId) {
  return {
    ticketId,
    issueNumber: issueNumber(ticketId),
    status: "ready" as const,
    validationKind: "ready" as const,
    artifactPath: `docs/live-evidence/release/${ticketId.toLowerCase()}-evidence.json`,
    artifactSha256: EVIDENCE_SHA,
  };
}

function issueNumber(ticketId: PackagedLiveEvidenceTicketId): number {
  return {
    "DF-241": 151,
    "DF-242": 152,
    "DF-243": 153,
    "DF-245": 155,
    "DF-246": 156,
    "DF-247": 157,
  }[ticketId];
}
