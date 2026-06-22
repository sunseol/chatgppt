import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  evaluatePackagedLiveEvidenceIndex,
  formatPackagedLiveEvidenceIndexSummary,
  type PackagedLiveEvidenceIndex,
} from "./packaged-live-evidence-index";

const INDEX_PATH = "docs/live-evidence/release/packaged-live-evidence-index.json";

const PackagedLiveEvidenceEntryArtifactSchema = z
  .object({
    ticketId: z.enum([
      "DF-205",
      "DF-233",
      "DF-235",
      "DF-241",
      "DF-242",
      "DF-243",
      "DF-244",
      "DF-245",
      "DF-246",
      "DF-247",
    ]),
    issueNumber: z.number().int().positive(),
    status: z.enum(["ready", "blocked"]),
    validationKind: z.enum(["ready", "blocked"]),
    packageArchiveSha256: z.string(),
    artifactPath: z.string(),
    artifactSha256: z.string(),
  })
  .strict();

const PackagedLiveEvidenceIndexArtifactSchema = z
  .object({
    path: z.string(),
    packageArchiveSha256: z.string(),
    generatedAt: z.string(),
    entries: z.array(PackagedLiveEvidenceEntryArtifactSchema),
  })
  .strict();

const ChildEvidencePackageSchema = z.object({
  ticketId: z.string(),
  packageArchiveSha256: z.string(),
  currentEvidence: z
    .array(
      z
        .object({
          path: z.string(),
          sha256: z.string().optional(),
        })
        .passthrough(),
    )
    .optional(),
  handoffEvidence: z
    .object({
      manualQaCandidatePackageSha256: z.string().optional(),
      packageRecheckPath: z.string().optional(),
      packageRecheckSha256: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

type ChildEvidenceArtifact = z.infer<typeof ChildEvidencePackageSchema>;

describe("packaged live evidence index artifact", () => {
  test("validates the committed release evidence index and entry digests", () => {
    // Given
    const index = readIndexArtifact(INDEX_PATH);
    const childEvidenceArtifacts = index.entries.map((entry) =>
      readChildEvidenceArtifact(entry.artifactPath),
    );

    // When
    const result = evaluatePackagedLiveEvidenceIndex(index);
    const mismatchedDigests = index.entries
      .filter((entry) => sha256File(entry.artifactPath) !== entry.artifactSha256)
      .map((entry) => entry.ticketId);
    const mismatchedPackageHashes = index.entries
      .filter((entry) => readChildPackageHash(entry.artifactPath) !== entry.packageArchiveSha256)
      .map((entry) => entry.ticketId);
    const mismatchedEvidenceRefs = childEvidenceArtifacts.flatMap(evidenceReferenceDigestIssues);
    const mismatchedHandoffRefs = childEvidenceArtifacts.flatMap(handoffEvidenceDigestIssues);
    const summary = formatPackagedLiveEvidenceIndexSummary(index);

    // Then
    expect(index.path).toBe(INDEX_PATH);
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["packaged_live_ticket_blocked"]);
    expect(result.issues[0]?.refs).toEqual([
      "DF-205",
      "DF-233",
      "DF-235",
      "DF-241",
      "DF-242",
      "DF-243",
      "DF-245",
      "DF-246",
      "DF-247",
    ]);
    expect(mismatchedDigests).toEqual([]);
    expect(mismatchedPackageHashes).toEqual([]);
    expect(mismatchedEvidenceRefs).toEqual([]);
    expect(mismatchedHandoffRefs).toEqual([]);
    expect(summary.includes("Ready tickets: 1 of 10")).toBe(true);
  });
});

function readIndexArtifact(path: string): PackagedLiveEvidenceIndex {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  return PackagedLiveEvidenceIndexArtifactSchema.parse(parsed);
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readChildPackageHash(path: string): string {
  return readChildEvidenceArtifact(path).packageArchiveSha256;
}

function readChildEvidenceArtifact(path: string): ChildEvidenceArtifact {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  return ChildEvidencePackageSchema.parse(parsed);
}

function evidenceReferenceDigestIssues(artifact: ChildEvidenceArtifact): readonly string[] {
  return (artifact.currentEvidence ?? [])
    .filter((reference) => reference.sha256 !== undefined)
    .flatMap((reference) => {
      if (!existsSync(reference.path)) return [`${artifact.ticketId}:${reference.path}:missing`];
      return sha256File(reference.path) === reference.sha256
        ? []
        : [`${artifact.ticketId}:${reference.path}:sha-mismatch`];
    });
}

function handoffEvidenceDigestIssues(artifact: ChildEvidenceArtifact): readonly string[] {
  const handoff = artifact.handoffEvidence;
  if (!handoff) return [];

  return [
    ...(handoff.manualQaCandidatePackageSha256 === undefined ||
    handoff.manualQaCandidatePackageSha256 === artifact.packageArchiveSha256
      ? []
      : [`${artifact.ticketId}:handoff-package-sha-mismatch`]),
    ...(handoff.packageRecheckPath === undefined || handoff.packageRecheckSha256 === undefined
      ? []
      : handoffRecheckDigestIssue(
          artifact,
          handoff.packageRecheckPath,
          handoff.packageRecheckSha256,
        )),
  ];
}

function handoffRecheckDigestIssue(
  artifact: ChildEvidenceArtifact,
  path: string,
  expectedSha256: string,
): readonly string[] {
  if (!existsSync(path)) return [`${artifact.ticketId}:${path}:missing`];
  return sha256File(path) === expectedSha256
    ? []
    : [`${artifact.ticketId}:${path}:handoff-sha-mismatch`];
}
