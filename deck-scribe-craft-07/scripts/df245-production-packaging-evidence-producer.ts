import {
  evaluateProductionPackagingEvidence,
  formatProductionPackagingEvidenceSummary,
  type ProductionPackagingEvidenceResult,
} from "../src/lib/production-packaging-evidence";
import type { Df245ProductionPackagingInput } from "./df245-production-packaging-evidence-schema";
export {
  Df245ProductionPackagingInputError,
  parseDf245ProductionPackagingInput,
  parseDf245ProductionPackagingJson,
} from "./df245-production-packaging-evidence-schema";

export type Df245ProductionPackagingEvidence = {
  readonly capturedAt: string;
  readonly evidenceKind: "df245-production-packaging-evidence";
  readonly status: "ready" | "blocked";
  readonly packageArchiveSha256: string;
  readonly packagePath: string;
  readonly nativeMacosBundlePath: string;
  readonly packagingValidation: ProductionPackagingEvidenceResult;
  readonly summary: string;
  readonly releaseBlockers: readonly string[];
};

export function produceDf245ProductionPackagingEvidence(
  input: Df245ProductionPackagingInput,
): Df245ProductionPackagingEvidence {
  const packagingValidation = evaluateProductionPackagingEvidence(input.packagingEvidence);
  const releaseBlockers = [
    ...packageHashBlockers(input),
    ...(packagingValidation.kind === "ready"
      ? []
      : ["DF-245 production packaging validation is blocked"]),
  ];
  return {
    capturedAt: input.capturedAt,
    evidenceKind: "df245-production-packaging-evidence",
    status: releaseBlockers.length === 0 ? "ready" : "blocked",
    packageArchiveSha256: input.packageArchiveSha256,
    packagePath: input.packagingEvidence.packagePath,
    nativeMacosBundlePath: input.packagingEvidence.nativeMacosBundlePath,
    packagingValidation,
    summary: formatProductionPackagingEvidenceSummary(input.packagingEvidence),
    releaseBlockers,
  };
}

function packageHashBlockers(input: Df245ProductionPackagingInput): readonly string[] {
  return input.packageArchiveSha256 === input.packagingEvidence.packageSha256
    ? []
    : ["DF-245 packaging input package hash does not match the packaging evidence"];
}
