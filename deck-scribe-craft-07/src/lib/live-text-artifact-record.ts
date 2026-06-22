import { hashContent } from "./artifacts";
import type { ProviderArtifactProvenance } from "./provider-provenance";

export type LiveTextArtifactType =
  | "interview_questions"
  | "interview_brief"
  | "deck_plan"
  | "design_system"
  | "layout_ir";

export type LiveTextArtifactRecord = {
  readonly artifactId: string;
  readonly projectId: string;
  readonly artifactType: LiveTextArtifactType;
  readonly version: number;
  readonly hash: string;
  readonly path: string;
  readonly createdAt: number;
  readonly turnId?: string;
  readonly threadId?: string;
};

export type LiveTextPersistedArtifact<TArtifact> = {
  readonly artifact: TArtifact;
  readonly provenance: ProviderArtifactProvenance;
  readonly record: LiveTextArtifactRecord;
  readonly content: string;
};

export function createPersistedLiveTextArtifact<TArtifact>(input: {
  readonly projectId: string;
  readonly artifactType: LiveTextArtifactType;
  readonly artifact: TArtifact;
  readonly provenance: ProviderArtifactProvenance;
  readonly createdAt: number;
  readonly version: number;
}): LiveTextPersistedArtifact<TArtifact> {
  const content = JSON.stringify({ artifact: input.artifact, provenance: input.provenance });
  const folder = folderForArtifactType(input.artifactType);
  return {
    artifact: input.artifact,
    provenance: input.provenance,
    content,
    record: {
      artifactId: input.provenance.artifactId,
      projectId: input.projectId,
      artifactType: input.artifactType,
      version: input.version,
      hash: hashContent(content),
      path: `projects/${input.projectId}/${folder}/${input.provenance.artifactId}.json`,
      createdAt: input.createdAt,
      ...(input.provenance.turnId === undefined ? {} : { turnId: input.provenance.turnId }),
      ...(input.provenance.threadId === undefined ? {} : { threadId: input.provenance.threadId }),
    },
  };
}

function folderForArtifactType(type: LiveTextArtifactType): string {
  switch (type) {
    case "interview_questions":
    case "interview_brief":
      return "briefs";
    case "deck_plan":
      return "plans";
    case "design_system":
      return "design";
    case "layout_ir":
      return "layout_prototypes";
    default:
      return assertNever(type);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected live text artifact type: ${String(value)}`);
}
