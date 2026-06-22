import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { z } from "zod";

const PACKAGE_PATH = "dist/deckforge-macos-dry-run.tgz";
const PACKAGE_RECHECK_PATH = "docs/live-evidence/release/df245-package-recheck-20260622.json";
const DRY_RUN_LAUNCH_PATH = "docs/live-evidence/release/df245-dry-run-launch-smoke-20260622.json";
const RELEASE_TRUST_PATH =
  "docs/live-evidence/release/df245-release-trust-codesign-notarytool-stapler-spctl-20260622.json";
const SHA256_HEX = /^[a-f0-9]{64}$/;

const CommandResultSchema = z
  .object({
    command: z.string().min(1),
    exitCode: z.number().int().nullable(),
    signal: z.string().nullable(),
    stdout: z.array(z.string()),
    stderr: z.array(z.string()),
  })
  .strict();

const PackageArchiveSchema = z
  .object({
    path: z.literal(PACKAGE_PATH),
    sha256: z.string().regex(SHA256_HEX),
    bytes: z.number().int().positive(),
  })
  .strict();

const PackageRecheckSchema = z
  .object({
    capturedAt: z.string().datetime(),
    evidenceKind: z.literal("df245-current-package-recheck"),
    status: z.literal("blocked"),
    packageArchive: PackageArchiveSchema.extend({
      archiveMembers: z.number().int().positive().nullable(),
    }),
    contentScan: z
      .object({
        roots: z.array(z.string().min(1)),
        localAbsolutePathMarker: z.string().min(1),
        fileCount: z.number().int().positive(),
        fixedStringHits: z.record(z.array(z.string())),
        regexHits: z.record(z.array(z.string())),
        passed: z.literal(true),
      })
      .strict(),
    signingAndTrust: z
      .object({
        codesigningIdentities: CommandResultSchema,
        dmgCodesign: CommandResultSchema,
        appCodesignVerify: CommandResultSchema,
        gatekeeperAssess: CommandResultSchema,
      })
      .strict(),
    blockers: z.array(z.string().min(1)),
  })
  .passthrough();

const DryRunLaunchSchema = z
  .object({
    capturedAt: z.string().datetime(),
    evidenceKind: z.literal("df245-dry-run-launch-smoke"),
    status: z.literal("passed"),
    scope: z.string().min(1),
    packageArchive: z
      .object({
        path: z.literal(PACKAGE_PATH),
        sha256: z.string().regex(SHA256_HEX),
      })
      .strict(),
    httpProbe: z
      .object({
        status: z.literal(200),
        bodyBytes: z.number().int().positive(),
      })
      .passthrough(),
    assetProbes: z.array(
      z
        .object({
          path: z.string().startsWith("/assets/"),
          status: z.literal(200),
          bodyBytes: z.number().int().positive(),
          sha256: z.string().regex(SHA256_HEX),
        })
        .passthrough(),
    ),
    blockers: z.array(z.string().min(1)),
  })
  .passthrough();

const ReleaseTrustBlockerSchema = z
  .object({
    capturedAt: z.string().datetime(),
    evidenceKind: z.literal("df245-release-trust-blocker"),
    status: z.literal("blocked"),
    packageArchive: PackageArchiveSchema,
    requiredTrust: z
      .object({
        signature: z.literal("developer_id"),
        notarizationStatus: z.literal("accepted"),
        stapled: z.literal(true),
        gatekeeperAccepted: z.literal(true),
      })
      .strict(),
    observedTrust: z
      .object({
        signature: z.literal("unsigned-or-adhoc"),
        teamIdentifier: z.literal("not set"),
        notarizationStatus: z.literal("missing"),
        stapled: z.literal(false),
        gatekeeperAccepted: z.literal(false),
      })
      .strict(),
    commands: z
      .object({
        codesigningIdentities: CommandResultSchema,
        dmgCodesign: CommandResultSchema,
        appCodesignVerify: CommandResultSchema,
        notarytoolHistory: CommandResultSchema,
        staplerValidateDmg: CommandResultSchema,
        gatekeeperAssessDmg: CommandResultSchema,
      })
      .strict(),
    blockers: z.array(z.string().min(1)),
  })
  .passthrough();

describe("DF-245 generated release evidence artifacts", () => {
  test("keep local package evidence blocked while matching the current dry-run package", () => {
    // Given
    const packageSha256 = sha256File(PACKAGE_PATH);
    const packageRecheck = readJson(PACKAGE_RECHECK_PATH, PackageRecheckSchema);
    const dryRunLaunch = readJson(DRY_RUN_LAUNCH_PATH, DryRunLaunchSchema);
    const releaseTrust = readJson(RELEASE_TRUST_PATH, ReleaseTrustBlockerSchema);

    // When
    const scanHits = [
      ...Object.values(packageRecheck.contentScan.fixedStringHits).flat(),
      ...Object.values(packageRecheck.contentScan.regexHits).flat(),
    ];

    // Then
    expect(packageRecheck.packageArchive.sha256).toBe(packageSha256);
    expect(dryRunLaunch.packageArchive.sha256).toBe(packageSha256);
    expect(releaseTrust.packageArchive.sha256).toBe(packageSha256);
    const fixedStringPatterns = Object.keys(packageRecheck.contentScan.fixedStringHits);
    expect(packageRecheck.contentScan.localAbsolutePathMarker).toBe(process.cwd());
    expect(fixedStringPatterns.includes(process.cwd())).toBe(true);
    expect(fixedStringPatterns.includes("/Users/jake/chatgppt-live-product-completion")).toBe(
      false,
    );
    expect(scanHits).toEqual([]);
    expect(dryRunLaunch.assetProbes.length > 0).toBe(true);
    expect(releaseTrust.commands.notarytoolHistory.exitCode === 0).toBe(false);
    expect(releaseTrust.commands.gatekeeperAssessDmg.exitCode === 0).toBe(false);
    expect(
      packageRecheck.blockers.includes("Developer ID Application signing identity not available"),
    ).toBe(true);
    expect(
      packageRecheck.blockers.includes(
        "clean macOS account install/login/image credential/project launch/live interview evidence not recorded",
      ),
    ).toBe(true);
    expect(dryRunLaunch.blockers.includes("clean macOS account execution not present")).toBe(true);
    expect(releaseTrust.blockers).toEqual([
      "Developer ID Application signing identity not available",
      "notarytool credentials and accepted notarization not available",
      "stapled DMG or app not available",
      "Gatekeeper rejects the unsigned DMG",
    ]);
  });
});

function readJson<Schema extends z.ZodType>(path: string, schema: Schema): z.infer<Schema> {
  return schema.parse(JSON.parse(readFileSync(path, "utf8")));
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
