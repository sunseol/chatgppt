import {
  evaluateLiveManualQaEvidence,
  formatLiveManualQaEvidenceSummary,
  type LiveManualQaEvidenceResult,
} from "../src/lib/live-manual-qa-evidence";
import type { Df246PackagedManualQaInput } from "./df246-packaged-manual-qa-evidence-schema";
export {
  Df246PackagedManualQaInputError,
  parseDf246PackagedManualQaInput,
  parseDf246PackagedManualQaJson,
} from "./df246-packaged-manual-qa-evidence-schema";

export type Df246PackagedManualQaEvidence = {
  readonly capturedAt: string;
  readonly evidenceKind: "df246-packaged-manual-qa-evidence";
  readonly status: "ready" | "blocked";
  readonly packageArchiveSha256: string;
  readonly sessionEvidencePath: string;
  readonly testerRole: Df246PackagedManualQaInput["sessionEvidence"]["testerRole"];
  readonly manualQaValidation: LiveManualQaEvidenceResult;
  readonly summary: string;
  readonly releaseBlockers: readonly string[];
};

export function produceDf246PackagedManualQaEvidence(
  input: Df246PackagedManualQaInput,
): Df246PackagedManualQaEvidence {
  const manualQaValidation = evaluateLiveManualQaEvidence(input.sessionEvidence);
  const releaseBlockers = [
    ...packageBlockers(input),
    ...(manualQaValidation.kind === "ready" ? [] : ["DF-246 manual QA validation is blocked"]),
  ];
  return {
    capturedAt: input.capturedAt,
    evidenceKind: "df246-packaged-manual-qa-evidence",
    status: releaseBlockers.length === 0 ? "ready" : "blocked",
    packageArchiveSha256: input.packageArchiveSha256,
    sessionEvidencePath: input.sessionEvidence.sessionEvidencePath,
    testerRole: input.sessionEvidence.testerRole,
    manualQaValidation,
    summary: formatLiveManualQaEvidenceSummary(input.sessionEvidence),
    releaseBlockers,
  };
}

function packageBlockers(input: Df246PackagedManualQaInput): readonly string[] {
  return input.manualQaCandidatePackageSha256 === input.packageArchiveSha256
    ? []
    : ["DF-246 manual QA package hash does not match the release package"];
}
