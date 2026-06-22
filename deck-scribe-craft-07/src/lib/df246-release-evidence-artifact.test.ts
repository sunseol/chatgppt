import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";

const PACKAGE_PATH = "dist/deckforge-macos-dry-run.tgz";
const DF246_EVIDENCE_PATH = "docs/live-evidence/release/df246-evidence.json";
const DF246_CANDIDATE_PATH =
  "docs/live-evidence/release/df246-packaged-manual-qa-handoff-candidate-20260622.json";
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
    currentEvidence: z.array(
      z
        .object({
          path: z.string().min(1),
          sha256: z.string().regex(SHA256_HEX).optional(),
        })
        .passthrough(),
    ),
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

const Df246CandidateSchema = z
  .object({
    evidenceKind: z.literal("df246-packaged-manual-qa-evidence"),
    status: z.literal("blocked"),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    checklistPath: z.literal(CHECKLIST_PATH),
    packageRecheckPath: z.literal(PACKAGE_RECHECK_PATH),
    sessionEvidencePath: z.null(),
    testerRole: z.null(),
    manualQaValidation: z
      .object({
        kind: z.literal("blocked"),
        issues: z.array(
          z
            .object({
              code: z.literal("missing_manual_qa_session_evidence"),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
    releaseBlockers: z.array(z.string().min(1)),
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
    const candidate = readJson(DF246_CANDIDATE_PATH, Df246CandidateSchema);
    const candidateRef = releaseRef(evidence, DF246_CANDIDATE_PATH);

    // Then
    expect(evidence.packageArchiveSha256).toBe(packageSha256);
    expect(evidence.handoffEvidence.manualQaCandidatePackageSha256).toBe(packageSha256);
    expect(evidence.handoffEvidence.checklistSha256).toBe(checklistSha256);
    expect(evidence.handoffEvidence.packageRecheckSha256).toBe(packageRecheckSha256);
    expect(candidate.packageArchiveSha256).toBe(packageSha256);
    expect(candidateRef.sha256).toBe(sha256File(DF246_CANDIDATE_PATH));
    expect(candidate.releaseBlockers).toEqual([
      "DF-246 manual QA session evidence JSON is missing",
      "DF-246 manual QA validation is blocked",
    ]);
    expect(candidate.manualQaValidation.issues.map((issue) => issue.code)).toEqual([
      "missing_manual_qa_session_evidence",
    ]);
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

function releaseRef(
  evidence: z.infer<typeof Df246EvidenceSchema>,
  path: string,
): z.infer<typeof Df246EvidenceSchema>["currentEvidence"][number] {
  const reference = evidence.currentEvidence.find((item) => item.path === path);
  if (!reference) throw new Error(`Missing DF-246 release evidence reference: ${path}`);
  return reference;
}
