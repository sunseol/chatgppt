export type ArtifactType =
  | "brief"
  | "research"
  | "plan"
  | "design"
  | "layout"
  | "asset"
  | "slides"
  | "layers"
  | "report"
  | "export"
  | "project";

export interface ArtifactRecord {
  readonly id: string;
  readonly projectId: string;
  readonly type: ArtifactType;
  readonly version: number;
  readonly hash: string;
  readonly path: string;
  readonly createdAt: number;
}

const FOLDERS: Record<ArtifactType, string> = {
  brief: "briefs",
  research: "research",
  plan: "plans",
  design: "design",
  layout: "layout_prototypes",
  asset: "assets",
  slides: "slides",
  layers: "slides",
  report: "exports",
  export: "exports",
  project: "contexts",
};

export function hashContent(content: string): string {
  let hash = 2_166_136_261;
  for (const character of content) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return `sha256:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createArtifactRecord(input: {
  readonly projectId: string;
  readonly type: ArtifactType;
  readonly version: number;
  readonly content: string;
  readonly createdAt?: number;
}): ArtifactRecord {
  return {
    id: `${input.projectId}_${input.type}_v${input.version}`,
    projectId: input.projectId,
    type: input.type,
    version: input.version,
    hash: hashContent(input.content),
    path: `projects/${input.projectId}/${FOLDERS[input.type]}/${input.type}.v${input.version}.json`,
    createdAt: input.createdAt ?? Date.now(),
  };
}

export function getProjectFolderSchema(projectId: string): string[] {
  return [
    `projects/${projectId}/briefs`,
    `projects/${projectId}/research`,
    `projects/${projectId}/plans`,
    `projects/${projectId}/design`,
    `projects/${projectId}/layout_prototypes`,
    `projects/${projectId}/contexts`,
    `projects/${projectId}/assets`,
    `projects/${projectId}/slides`,
    `projects/${projectId}/exports`,
    `projects/${projectId}/audit`,
  ];
}
