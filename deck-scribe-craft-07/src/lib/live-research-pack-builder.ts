import type { EvidenceExtractionResult } from "./evidence-extractor";
import { attachLiveResearchEvidenceRefs } from "./live-research-evidence-builder";
import {
  buildResearchPackFromEvidence,
  type ResearchSourceRecordInput,
} from "./research-orchestrator";
import type { ResearchPack, ResearchSourceCaptureMetadata } from "./research-types";

export type LiveResearchSourceRecordInput = ResearchSourceRecordInput & {
  readonly capture: ResearchSourceCaptureMetadata;
};

export type LiveResearchPackBuildInput = {
  readonly id: string;
  readonly generatedAt: number;
  readonly sources: readonly LiveResearchSourceRecordInput[];
  readonly evidenceResults: readonly EvidenceExtractionResult[];
};

export function buildLiveResearchPackFromEvidence(input: LiveResearchPackBuildInput): ResearchPack {
  const pack = buildResearchPackFromEvidence({
    id: input.id,
    generatedAt: input.generatedAt,
    sources: input.sources,
    evidenceResults: input.evidenceResults,
  });
  return attachLiveResearchEvidenceRefs({
    pack: {
      ...pack,
      sources: pack.sources.map((source) => ({
        ...source,
        capture: captureForSource(input.sources, source.id),
      })),
    },
    evidenceResults: input.evidenceResults,
  });
}

function captureForSource(
  sources: readonly LiveResearchSourceRecordInput[],
  sourceId: string,
): ResearchSourceCaptureMetadata {
  const source = sources.find((candidate) => candidate.id === sourceId);
  if (!source) throw new LiveResearchSourceCaptureMissingError(sourceId);
  return source.capture;
}

class LiveResearchSourceCaptureMissingError extends Error {
  readonly name = "LiveResearchSourceCaptureMissingError";

  constructor(readonly sourceId: string) {
    super(`Live research source ${sourceId} is missing capture metadata.`);
  }
}
