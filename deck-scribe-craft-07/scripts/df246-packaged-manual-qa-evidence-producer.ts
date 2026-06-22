import {
  evaluateLiveManualQaEvidence,
  formatLiveManualQaEvidenceSummary,
  type LiveManualQaIssue,
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
  readonly checklistPath: Df246PackagedManualQaInput["checklistPath"];
  readonly packageRecheckPath: Df246PackagedManualQaInput["packageRecheckPath"];
  readonly sessionEvidencePath: string | null;
  readonly testerRole: Df246PackagedManualQaInput["sessionEvidence"] extends infer Evidence
    ? Evidence extends { testerRole: infer Role }
      ? Role | null
      : null
    : null;
  readonly manualQaValidation: LiveManualQaEvidenceResult;
  readonly summary: string;
  readonly releaseBlockers: readonly string[];
};

export function produceDf246PackagedManualQaEvidence(
  input: Df246PackagedManualQaInput,
): Df246PackagedManualQaEvidence {
  const manualQaValidation = manualQaValidationResult(input);
  const releaseBlockers = [
    ...packageBlockers(input),
    ...(input.sessionEvidence === undefined
      ? ["DF-246 manual QA session evidence JSON is missing"]
      : []),
    ...(manualQaValidation.kind === "ready" ? [] : ["DF-246 manual QA validation is blocked"]),
  ];
  return {
    capturedAt: input.capturedAt,
    evidenceKind: "df246-packaged-manual-qa-evidence",
    status: releaseBlockers.length === 0 ? "ready" : "blocked",
    packageArchiveSha256: input.packageArchiveSha256,
    checklistPath: input.checklistPath,
    packageRecheckPath: input.packageRecheckPath,
    sessionEvidencePath: input.sessionEvidence?.sessionEvidencePath ?? null,
    testerRole: input.sessionEvidence?.testerRole ?? null,
    manualQaValidation,
    summary: summary(input),
    releaseBlockers,
  };
}

function packageBlockers(input: Df246PackagedManualQaInput): readonly string[] {
  return input.manualQaCandidatePackageSha256 === input.packageArchiveSha256
    ? []
    : ["DF-246 manual QA package hash does not match the release package"];
}

function manualQaValidationResult(input: Df246PackagedManualQaInput): LiveManualQaEvidenceResult {
  return input.sessionEvidence === undefined
    ? {
        kind: "blocked",
        issues: [missingSessionEvidenceIssue()],
      }
    : evaluateLiveManualQaEvidence(input.sessionEvidence);
}

function missingSessionEvidenceIssue(): LiveManualQaIssue {
  return {
    code: "missing_manual_qa_session_evidence",
    message: "Manual QA must cite a persisted non-synthetic session evidence bundle.",
    refs: ["missing"],
  };
}

function summary(input: Df246PackagedManualQaInput): string {
  return input.sessionEvidence === undefined
    ? [
        "# DF-246 Live Manual QA",
        "tester role: missing",
        "setup target: 10 minutes · actual: missing",
        `checklist: ${input.checklistPath}`,
        `package recheck: ${input.packageRecheckPath}`,
        "status: blocked pending non-developer manual QA session evidence JSON",
      ].join("\n")
    : formatLiveManualQaEvidenceSummary(input.sessionEvidence);
}
