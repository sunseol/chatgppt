import { z } from "zod";
import {
  parseDf246PackagedManualQaInput,
  type Df246PackagedManualQaInput,
} from "./df246-packaged-manual-qa-evidence-schema";

export const CURRENT_DF246_CHECKLIST_PATH = "docs/live-manual-qa-checklist.md";
export const CURRENT_DF246_PACKAGE_RECHECK_PATH =
  "docs/live-evidence/release/df245-package-recheck-20260622.json";

const PackageRecheckEvidenceSchema = z
  .object({
    evidenceKind: z.literal("df245-current-package-recheck"),
    packageArchive: z
      .object({
        sha256: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough();

export type Df246PackageRecheckEvidence = z.infer<typeof PackageRecheckEvidenceSchema>;

export type BuildDf246PackagedManualQaInputFromReleaseHandoffOptions = {
  readonly capturedAt: string;
  readonly packageRecheck: Df246PackageRecheckEvidence;
};

export function parseDf246PackageRecheckEvidenceJson(raw: string): Df246PackageRecheckEvidence {
  return PackageRecheckEvidenceSchema.parse(JSON.parse(raw));
}

export function buildDf246PackagedManualQaInputFromReleaseHandoff(
  options: BuildDf246PackagedManualQaInputFromReleaseHandoffOptions,
): Df246PackagedManualQaInput {
  return parseDf246PackagedManualQaInput({
    capturedAt: options.capturedAt,
    packageArchiveSha256: options.packageRecheck.packageArchive.sha256,
    manualQaCandidatePackageSha256: options.packageRecheck.packageArchive.sha256,
    checklistPath: CURRENT_DF246_CHECKLIST_PATH,
    packageRecheckPath: CURRENT_DF246_PACKAGE_RECHECK_PATH,
  });
}
