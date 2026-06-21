import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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
  packageArchiveSha256: z.string(),
});

describe("packaged live evidence index artifact", () => {
  test("validates the committed release evidence index and entry digests", () => {
    // Given
    const index = readIndexArtifact(INDEX_PATH);

    // When
    const result = evaluatePackagedLiveEvidenceIndex(index);
    const mismatchedDigests = index.entries
      .filter((entry) => sha256File(entry.artifactPath) !== entry.artifactSha256)
      .map((entry) => entry.ticketId);
    const mismatchedPackageHashes = index.entries
      .filter((entry) => readChildPackageHash(entry.artifactPath) !== entry.packageArchiveSha256)
      .map((entry) => entry.ticketId);
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
      "DF-244",
      "DF-245",
      "DF-246",
      "DF-247",
    ]);
    expect(mismatchedDigests).toEqual([]);
    expect(mismatchedPackageHashes).toEqual([]);
    expect(summary.includes("Ready tickets: 0 of 10")).toBe(true);
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
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  return ChildEvidencePackageSchema.parse(parsed).packageArchiveSha256;
}
