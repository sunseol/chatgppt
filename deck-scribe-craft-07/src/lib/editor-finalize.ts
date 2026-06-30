import type { ApprovalLogEntry, DeckProject } from "./deck-types";

export interface CreateEditorFinalizePatchInput {
  readonly project: DeckProject;
  readonly layerHash: string;
  readonly finalizedAt: number;
}

export function createEditorFinalizePatch({
  project,
  layerHash,
  finalizedAt,
}: CreateEditorFinalizePatchInput): Pick<DeckProject, "stage" | "invalidated" | "approvalLog"> {
  const invalidated = { ...project.invalidated };
  delete invalidated.editor;
  delete invalidated.export;
  return {
    stage: "FINAL_REPORTING",
    invalidated,
    approvalLog: [...project.approvalLog, editorApprovalEntry(project, layerHash, finalizedAt)],
  };
}

function editorApprovalEntry(
  project: DeckProject,
  layerHash: string,
  finalizedAt: number,
): ApprovalLogEntry {
  const artifactVersion =
    project.approvalLog.filter((entry) => entry.stage === "editor").length + 1;
  return {
    stage: "editor",
    at: finalizedAt,
    hash: layerHash,
    artifactId: `${project.id}_editor_v${artifactVersion}`,
    artifactVersion,
    artifactType: "editor",
  };
}
