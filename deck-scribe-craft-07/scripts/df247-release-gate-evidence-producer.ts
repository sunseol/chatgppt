import {
  evaluateLiveInitialReleaseGate,
  type LiveReleaseGateInput,
  type LiveReleaseGateResult,
} from "../src/lib/live-release-gate";
import { evaluatePackagedLiveEvidenceIndex } from "../src/lib/packaged-live-evidence-index";
import type {
  Df247ReleaseGateEvidenceInput,
  Df247ReleaseGateEvidenceReference,
} from "./df247-release-gate-evidence-schema";
export {
  Df247ReleaseGateEvidenceInputError,
  parseDf247ReleaseGateEvidenceInput,
  parseDf247ReleaseGateEvidenceJson,
} from "./df247-release-gate-evidence-schema";

export type Df247ReleaseGateEvidence = {
  readonly ticketId: "DF-247";
  readonly issueNumber: 157;
  readonly status: "ready" | "blocked";
  readonly validationKind: "ready" | "blocked";
  readonly generatedAt: string;
  readonly packageArchiveSha256: string;
  readonly packagedLiveEvidenceIndexPath: string;
  readonly releaseGateResult: LiveReleaseGateResult;
  readonly summary: string;
  readonly currentEvidence: readonly Df247ReleaseGateEvidenceReference[];
  readonly missingEvidence: readonly string[];
};

export function produceDf247ReleaseGateEvidence(
  input: Df247ReleaseGateEvidenceInput,
): Df247ReleaseGateEvidence {
  const packagedLiveEvidenceIndexResult = evaluatePackagedLiveEvidenceIndex(
    input.packagedLiveEvidenceIndex,
  );
  const releaseGateInput: LiveReleaseGateInput = {
    ...input.liveReleaseGate,
    packagedLiveEvidenceIndex: packagedLiveEvidenceIndexResult,
  };
  const releaseGateResult = evaluateLiveInitialReleaseGate(releaseGateInput);
  const missingEvidence = [
    ...packageHashBlockers(input),
    ...releaseGateMissingEvidence(releaseGateResult),
  ];
  const status = missingEvidence.length === 0 ? "ready" : "blocked";
  return {
    ticketId: "DF-247",
    issueNumber: 157,
    status,
    validationKind: status,
    generatedAt: input.capturedAt,
    packageArchiveSha256: input.packageArchiveSha256,
    packagedLiveEvidenceIndexPath: input.packagedLiveEvidenceIndex.path,
    releaseGateResult,
    summary: summary(status, missingEvidence.length),
    currentEvidence: input.currentEvidence,
    missingEvidence,
  };
}

function packageHashBlockers(input: Df247ReleaseGateEvidenceInput): readonly string[] {
  return input.packageArchiveSha256 === input.packagedLiveEvidenceIndex.packageArchiveSha256
    ? []
    : ["package_archive_sha_mismatch:packaged-live-evidence-index"];
}

function releaseGateMissingEvidence(result: LiveReleaseGateResult): readonly string[] {
  return result.kind === "ready"
    ? []
    : result.blockers.map((blocker) => `${blocker.code}:${blocker.refs.join(",")}`);
}

function summary(status: "ready" | "blocked", blockerCount: number): string {
  return status === "ready"
    ? "DF-247 release gate is ready with all upstream Live evidence and release decision checks satisfied."
    : `DF-247 release gate remains blocked by ${blockerCount} blocker(s).`;
}
