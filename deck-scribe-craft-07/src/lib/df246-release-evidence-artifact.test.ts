import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";

const PACKAGE_PATH = "dist/deckforge-macos-dry-run.tgz";
const DF246_EVIDENCE_PATH = "docs/live-evidence/release/df246-evidence.json";
const CHECKLIST_PATH = "docs/live-manual-qa-checklist.md";
const PACKAGE_RECHECK_PATH = "docs/live-evidence/release/df245-package-recheck-20260622.json";
const SHA256_HEX = /^[a-f0-9]{64}$/;

const Df246EvidenceSchema = z
  .object({
    ticketId: z.literal("DF-246"),
    issueNumber: z.literal(156),
    status: z.literal("blocked"),
    validationKind: z.literal("blocked"),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    handoffEvidence: z
      .object({
        manualQaCandidatePackageSha256: z.string().regex(SHA256_HEX),
        checklistPath: z.literal(CHECKLIST_PATH),
        checklistSha256: z.string().regex(SHA256_HEX),
        packageRecheckPath: z.literal(PACKAGE_RECHECK_PATH),
        packageRecheckSha256: z.string().regex(SHA256_HEX),
        releaseHandling: z.string().min(1),
      })
      .passthrough(),
    missingEvidence: z.array(z.string().min(1)),
  })
  .passthrough();

describe("DF-246 release evidence artifact", () => {
  test("keeps manual QA handoff blocked and tied to the current package basis", () => {
    // Given
    const packageSha256 = sha256File(PACKAGE_PATH);
    const checklistSha256 = sha256File(CHECKLIST_PATH);
    const packageRecheckSha256 = sha256File(PACKAGE_RECHECK_PATH);

    // When
    const evidence = readJson(DF246_EVIDENCE_PATH, Df246EvidenceSchema);

    // Then
    expect(evidence.packageArchiveSha256).toBe(packageSha256);
    expect(evidence.handoffEvidence.manualQaCandidatePackageSha256).toBe(packageSha256);
    expect(evidence.handoffEvidence.checklistSha256).toBe(checklistSha256);
    expect(evidence.handoffEvidence.packageRecheckSha256).toBe(packageRecheckSha256);
    expect(evidence.handoffEvidence.releaseHandling.includes("blocked until")).toBe(true);
    expect(evidence.missingEvidence.includes("non-developer tester session evidence JSON")).toBe(
      true,
    );
    expect(
      evidence.missingEvidence.includes(
        "severity issue list with zero P0 and zero critical errors",
      ),
    ).toBe(true);
  });
});

function readJson<Schema extends z.ZodType>(path: string, schema: Schema): z.infer<Schema> {
  return schema.parse(JSON.parse(readFileSync(path, "utf8")));
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
