import { describe, expect, test } from "bun:test";
import { validateLiveResearchEvidence } from "./live-research-evidence";
import { liveApprovedResearchPackFixture } from "./live-research-approval-test-fixtures";

describe("live research source artifact evidence", () => {
  test("rejects evidence refs that point at a different captured source artifact", () => {
    const pack = liveApprovedResearchPackFixture();
    const [evidenceRef] = pack.liveEvidenceRefs ?? [];
    if (!evidenceRef) throw new Error("Expected live evidence fixture.");

    const report = validateLiveResearchEvidence({
      pack,
      evidenceRefs: [
        {
          ...evidenceRef,
          sourceArtifactPath: "docs/live-source-capture-bundle/other/original.html",
        },
      ],
    });

    expect(report.valid).toBe(false);
    expect(report.fatalIssues.map((issue) => issue.code)).toEqual(["source_artifact_mismatch"]);
  });
});
