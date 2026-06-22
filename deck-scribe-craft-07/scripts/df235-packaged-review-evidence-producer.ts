import { hasNonSyntheticEvidencePath } from "../src/lib/live-evidence-path";
import type {
  Df235PackagedFailureProof,
  Df235PackagedReviewInput,
  Df235PackagedReviewProof,
} from "./df235-packaged-review-evidence-schema";
export {
  Df235PackagedReviewInputError,
  parseDf235PackagedReviewInput,
  parseDf235PackagedReviewJson,
} from "./df235-packaged-review-evidence-schema";

export type Df235PackagedReviewEvidence = {
  readonly capturedAt: string;
  readonly evidenceKind: "df235-packaged-review-evidence";
  readonly status: "ready" | "blocked";
  readonly packageArchiveSha256: string;
  readonly reviewSessionId: string;
  readonly approval?: Df235PackagedApprovalSummary;
  readonly failurePreservation?: Df235PackagedFailurePreservationSummary;
  readonly releaseBlockers: readonly string[];
};

export type Df235PackagedApprovalSummary = {
  readonly evidencePath: string;
  readonly projectId: string;
  readonly eventId: string;
  readonly approvedSlide: {
    readonly number: number;
    readonly version: number;
  };
  readonly displayEvidencePath: string;
};

export type Df235PackagedFailurePreservationSummary = {
  readonly evidencePath: string;
  readonly projectId: string;
  readonly eventId: string;
  readonly preservedSlide: {
    readonly number: number;
    readonly version: number;
  };
  readonly displayEvidencePath: string;
};

export function produceDf235PackagedReviewEvidence(
  input: Df235PackagedReviewInput,
): Df235PackagedReviewEvidence {
  const approval = approvalSummary(input.approvalProof);
  const failurePreservation = failurePreservationSummary(input.failurePreservationProof);
  const releaseBlockers = [
    ...reviewSessionBlockers(input),
    ...approvalBlockers(input),
    ...failurePreservationBlockers(input),
    ...distinctProofBlockers(input),
  ];
  return {
    capturedAt: input.capturedAt,
    evidenceKind: "df235-packaged-review-evidence",
    status: releaseBlockers.length === 0 ? "ready" : "blocked",
    packageArchiveSha256: input.packageArchiveSha256,
    reviewSessionId: input.reviewSession.sessionId,
    ...(approval === undefined ? {} : { approval }),
    ...(failurePreservation === undefined ? {} : { failurePreservation }),
    releaseBlockers,
  };
}

function reviewSessionBlockers(input: Df235PackagedReviewInput): readonly string[] {
  return input.reviewSession.packageArchiveSha256 === input.packageArchiveSha256
    ? []
    : ["DF-235 packaged review session package hash does not match the release package"];
}

function approvalBlockers(input: Df235PackagedReviewInput): readonly string[] {
  const proof = input.approvalProof;
  if (proof === undefined) return ["DF-235 packaged approval proof is missing"];
  const event = proof.reviewEvidence.event;
  return [
    ...proofSessionBlockers(proof.sessionId, input.reviewSession.sessionId, "approval"),
    ...jsonEvidencePathBlockers(proof.evidencePath, "approval review"),
    ...displayPathBlockers(proof.displayEvidence.evidencePath, "approval display"),
    ...(proof.displayEvidence.beforeVisible &&
    proof.displayEvidence.afterVisible &&
    proof.displayEvidence.approvalVisible &&
    proof.displayEvidence.preservationChecksVisible
      ? []
      : ["DF-235 packaged approval display evidence is incomplete"]),
    ...(event.outcome === "approved"
      ? approvalEventBlockers(event)
      : ["DF-235 packaged approval proof has the wrong review outcome"]),
  ];
}

function approvalEventBlockers(
  event: Df235PackagedReviewProof["reviewEvidence"]["event"],
): readonly string[] {
  if (event.outcome !== "approved") return ["DF-235 packaged approval proof is not approved"];
  return [
    ...(event.candidate.slide.number === event.approvedSlide.number &&
    event.candidate.slide.version === event.approvedSlide.version
      ? []
      : ["DF-235 packaged approved slide does not match the ready candidate"]),
    ...(event.comparison.slideNumber === event.candidate.slide.number &&
    event.comparison.revisedSlideVersion === event.candidate.slide.version
      ? []
      : ["DF-235 packaged approval comparison does not match the candidate"]),
    ...(event.comparison.preservationChecks.length > 0
      ? []
      : ["DF-235 packaged approval proof has no preservation checks"]),
  ];
}

function failurePreservationBlockers(input: Df235PackagedReviewInput): readonly string[] {
  const proof = input.failurePreservationProof;
  if (proof === undefined) return ["DF-235 packaged failure-preservation proof is missing"];
  const event = proof.reviewEvidence.event;
  return [
    ...proofSessionBlockers(proof.sessionId, input.reviewSession.sessionId, "failure-preservation"),
    ...jsonEvidencePathBlockers(proof.evidencePath, "failure-preservation review"),
    ...displayPathBlockers(proof.displayEvidence.evidencePath, "failure-preservation display"),
    ...(proof.displayEvidence.approvedOriginalVisible &&
    proof.displayEvidence.failureMessageVisible &&
    proof.displayEvidence.exportableOriginalVisible
      ? []
      : ["DF-235 packaged failure-preservation display evidence is incomplete"]),
    ...(event.outcome === "preserved_after_failure"
      ? failureEventBlockers(event)
      : ["DF-235 packaged failure-preservation proof has the wrong review outcome"]),
  ];
}

function failureEventBlockers(
  event: Df235PackagedFailureProof["reviewEvidence"]["event"],
): readonly string[] {
  if (event.outcome !== "preserved_after_failure") {
    return ["DF-235 packaged failure-preservation proof is not preserved_after_failure"];
  }
  return [
    ...(event.preservedSlide.number === event.slideNumber &&
    event.preservedSlide.version === event.originalSlideVersion
      ? []
      : ["DF-235 packaged failure-preservation slide does not match the approved original"]),
    ...(event.issues.length > 0 ? [] : ["DF-235 packaged failure proof has no provider issue"]),
  ];
}

function distinctProofBlockers(input: Df235PackagedReviewInput): readonly string[] {
  const approvalPath = input.approvalProof?.evidencePath;
  const failurePath = input.failurePreservationProof?.evidencePath;
  if (approvalPath === undefined || failurePath === undefined) return [];
  return approvalPath === failurePath
    ? ["DF-235 packaged approval and failure-preservation proofs reuse the same evidence path"]
    : [];
}

function proofSessionBlockers(
  proofSessionId: string,
  expectedSessionId: string,
  label: string,
): readonly string[] {
  return proofSessionId === expectedSessionId
    ? []
    : [`DF-235 packaged ${label} proof does not belong to the review session`];
}

function jsonEvidencePathBlockers(path: string, label: string): readonly string[] {
  return isDocsEvidencePath(path, [".json"])
    ? []
    : [`DF-235 packaged ${label} evidence path is not a committed JSON evidence file`];
}

function displayPathBlockers(path: string, label: string): readonly string[] {
  return isDocsEvidencePath(path, [".png", ".mp4", ".html"])
    ? []
    : [`DF-235 packaged ${label} evidence path is not a committed display artifact`];
}

function isDocsEvidencePath(path: string, allowedExtensions: readonly string[]): boolean {
  return (
    path.startsWith("docs/live-evidence/") && hasNonSyntheticEvidencePath(path, allowedExtensions)
  );
}

function approvalSummary(
  proof: Df235PackagedReviewInput["approvalProof"],
): Df235PackagedApprovalSummary | undefined {
  if (proof === undefined || proof.reviewEvidence.event.outcome !== "approved") return undefined;
  return {
    evidencePath: proof.evidencePath,
    projectId: proof.reviewEvidence.projectId,
    eventId: proof.reviewEvidence.eventId,
    approvedSlide: {
      number: proof.reviewEvidence.event.approvedSlide.number,
      version: proof.reviewEvidence.event.approvedSlide.version,
    },
    displayEvidencePath: proof.displayEvidence.evidencePath,
  };
}

function failurePreservationSummary(
  proof: Df235PackagedReviewInput["failurePreservationProof"],
): Df235PackagedFailurePreservationSummary | undefined {
  if (proof === undefined || proof.reviewEvidence.event.outcome !== "preserved_after_failure") {
    return undefined;
  }
  return {
    evidencePath: proof.evidencePath,
    projectId: proof.reviewEvidence.projectId,
    eventId: proof.reviewEvidence.eventId,
    preservedSlide: {
      number: proof.reviewEvidence.event.preservedSlide.number,
      version: proof.reviewEvidence.event.preservedSlide.version,
    },
    displayEvidencePath: proof.displayEvidence.evidencePath,
  };
}
