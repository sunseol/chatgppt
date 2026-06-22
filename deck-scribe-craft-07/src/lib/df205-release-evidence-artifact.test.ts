import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";

const PACKAGE_PATH = "dist/deckforge-macos-dry-run.tgz";
const TEST_PATH = "src/lib/df205-release-evidence-artifact.test.ts";
const DF205_EVIDENCE_PATH = "docs/live-evidence/release/df205-evidence.json";
const DF205_CANDIDATE_PATH =
  "docs/live-evidence/release/df205-packaged-auth-secret-candidate-20260622.json";
const PACKAGE_RECHECK_PATH = "docs/live-evidence/release/df245-package-recheck-20260622.json";
const CODEX_IMAGE_CAPABILITY_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/summary.json";
const SHA256_HEX = /^[a-f0-9]{64}$/;

const ReleaseEvidenceSchema = z
  .object({
    ticketId: z.literal("DF-205"),
    issueNumber: z.literal(131),
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
    missingEvidence: z.array(z.string().min(1)),
  })
  .passthrough();

const PackageRecheckSchema = z
  .object({
    evidenceKind: z.literal("df245-current-package-recheck"),
    status: z.literal("blocked"),
    packageArchive: z
      .object({
        path: z.literal(PACKAGE_PATH),
        sha256: z.string().regex(SHA256_HEX),
      })
      .passthrough(),
    contentScan: z
      .object({
        fixedStringHits: z.record(z.array(z.string())),
        regexHits: z.record(z.array(z.string())),
        passed: z.literal(true),
      })
      .passthrough(),
    blockers: z.array(z.string().min(1)),
  })
  .passthrough();

const AuthSecretCandidateSchema = z
  .object({
    evidenceKind: z.literal("df205-packaged-auth-secret-evidence"),
    status: z.literal("blocked"),
    packageArchiveSha256: z.string().regex(SHA256_HEX),
    accountMode: z.literal("authenticated_chatgpt_runtime"),
    keychainFallbackInstalled: z.null(),
    releaseBlockers: z.array(z.string().min(1)),
  })
  .passthrough();

describe("DF-205 release evidence artifact", () => {
  test("keeps auth secret lifecycle blocked while tied to the current package scan", () => {
    // Given
    const packageSha256 = sha256File(PACKAGE_PATH);
    const evidence = readJson(DF205_EVIDENCE_PATH, ReleaseEvidenceSchema);
    const packageRecheck = readJson(PACKAGE_RECHECK_PATH, PackageRecheckSchema);
    const candidate = readJson(DF205_CANDIDATE_PATH, AuthSecretCandidateSchema);
    const packageRecheckRef = releaseRef(evidence, PACKAGE_RECHECK_PATH);
    const candidateRef = releaseRef(evidence, DF205_CANDIDATE_PATH);
    const codexImageCapabilityRef = releaseRef(evidence, CODEX_IMAGE_CAPABILITY_PATH);

    // When
    const scanHits = [
      ...Object.values(packageRecheck.contentScan.fixedStringHits).flat(),
      ...Object.values(packageRecheck.contentScan.regexHits).flat(),
    ];

    // Then
    expect(evidence.packageArchiveSha256).toBe(packageSha256);
    expect(packageRecheck.packageArchive.sha256).toBe(packageSha256);
    expect(candidate.packageArchiveSha256).toBe(packageSha256);
    expect(evidence.currentEvidence.some((reference) => reference.path === TEST_PATH)).toBe(true);
    expect(packageRecheckRef.sha256).toBe(sha256File(PACKAGE_RECHECK_PATH));
    expect(candidateRef.sha256).toBe(sha256File(DF205_CANDIDATE_PATH));
    expect(codexImageCapabilityRef.sha256).toBe(sha256File(CODEX_IMAGE_CAPABILITY_PATH));
    expect(scanHits).toEqual([]);
    expect(candidate.releaseBlockers).toEqual([
      "DF-205 auth session was not captured from a packaged clean-account login run",
      "DF-205 fresh login evidence was not captured from a packaged clean-account run",
      "DF-205 logout/relogin evidence was not captured from a packaged clean-account run",
      "DF-205 logout/relogin proof is incomplete",
      "DF-205 logout/relogin proof does not cancel active live jobs",
      "DF-205 logout/relogin proof does not lock providers while logged out",
      "DF-205 logout/relogin proof does not restore provider readiness",
      "DF-205 keychain fallback lifecycle was not recorded for the packaged run",
      "DF-205 packaged secret leak scan was not captured from a clean-machine signed package run",
    ]);
    expect(evidence.missingEvidence).toEqual([
      "fresh login manual QA from an unauthenticated or clean macOS account",
      "logout/relogin QA proving active live jobs cancel and provider actions stay locked until login is restored",
      "packaged OS keychain write/read/delete lifecycle proof for any installed API-key fallback",
      "clean-machine persisted secret leak scan from the signed packaged run",
    ]);
    expect(
      packageRecheck.blockers.includes(
        "clean macOS account install/login/image credential/project launch/live interview evidence not recorded",
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
  evidence: z.infer<typeof ReleaseEvidenceSchema>,
  path: string,
): z.infer<typeof ReleaseEvidenceSchema>["currentEvidence"][number] {
  const reference = evidence.currentEvidence.find((item) => item.path === path);
  if (!reference) throw new Error(`Missing DF-205 release evidence reference: ${path}`);
  return reference;
}
