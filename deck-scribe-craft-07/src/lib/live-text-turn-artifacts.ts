import type { StructuredCodexAccepted } from "./codex-structured-task-runner";
import type { LiveInterviewTurnArtifact } from "./live-interview-cutover";
import type { LiveTextPipelineTurnArtifact } from "./live-text-pipeline-cutover";

export function interviewTurnArtifact<TArtifact>(
  accepted: StructuredCodexAccepted<TArtifact>,
): LiveInterviewTurnArtifact<TArtifact> {
  return { artifact: accepted.value, provenance: accepted.provenance };
}

export function optionalInterviewTurnArtifact<TArtifact>(
  accepted: StructuredCodexAccepted<TArtifact> | undefined,
): LiveInterviewTurnArtifact<TArtifact> | undefined {
  return accepted === undefined ? undefined : interviewTurnArtifact(accepted);
}

export function textTurnArtifact<TArtifact>(
  accepted: StructuredCodexAccepted<TArtifact>,
  deckContextId: string,
): LiveTextPipelineTurnArtifact<TArtifact> {
  return { artifact: accepted.value, provenance: accepted.provenance, deckContextId };
}
