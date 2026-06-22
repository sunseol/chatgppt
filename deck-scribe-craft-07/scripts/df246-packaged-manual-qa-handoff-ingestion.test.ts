import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { produceDf246PackagedManualQaEvidence } from "./df246-packaged-manual-qa-evidence-producer";
import {
  CURRENT_DF246_CHECKLIST_PATH,
  CURRENT_DF246_PACKAGE_RECHECK_PATH,
  buildDf246PackagedManualQaInputFromReleaseHandoff,
  parseDf246PackageRecheckEvidenceJson,
} from "./df246-packaged-manual-qa-handoff-ingestion";

describe("DF-246 packaged manual QA handoff ingestion", () => {
  test("turns current handoff evidence into a blocked packaged candidate without a fake session", () => {
    // Given
    const packageRecheck = parseDf246PackageRecheckEvidenceJson(
      readFileSync(CURRENT_DF246_PACKAGE_RECHECK_PATH, "utf8"),
    );

    // When
    const input = buildDf246PackagedManualQaInputFromReleaseHandoff({
      capturedAt: "2026-06-22T07:10:00.000Z",
      packageRecheck,
    });
    const evidence = produceDf246PackagedManualQaEvidence(input);

    // Then
    expect(input.checklistPath).toBe(CURRENT_DF246_CHECKLIST_PATH);
    expect(input.packageRecheckPath).toBe(CURRENT_DF246_PACKAGE_RECHECK_PATH);
    expect(input.packageArchiveSha256).toBe(packageRecheck.packageArchive.sha256);
    expect(input.manualQaCandidatePackageSha256).toBe(packageRecheck.packageArchive.sha256);
    expect(input.sessionEvidence).toBeUndefined();
    expect(evidence.status).toBe("blocked");
    expect(evidence.packageArchiveSha256).toBe(packageRecheck.packageArchive.sha256);
    expect(evidence.releaseBlockers).toEqual([
      "DF-246 manual QA session evidence JSON is missing",
      "DF-246 manual QA validation is blocked",
    ]);
  });
});
