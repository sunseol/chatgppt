import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function verifyObjectGraph({ manifest, manifestDir, pathField }) {
  const findings = [];
  const result = { checked: false, graph: null, findings };
  const filePath = manifest[pathField];
  if (!nonEmptyString(filePath)) {
    pushFinding(findings, "missing_object_graph_path", pathField);
    return result;
  }
  if (path.extname(filePath).toLowerCase() !== ".json") {
    pushFinding(findings, "invalid_object_graph_extension", pathField, path.extname(filePath));
  }
  const absolutePath = resolveManifestPath(manifestDir, filePath);
  try {
    const info = await stat(absolutePath);
    if (!info.isFile()) {
      pushFinding(findings, "referenced_path_not_file", pathField);
      return result;
    }
    result.graph = JSON.parse(await readFile(absolutePath, "utf8"));
    result.checked = true;
  } catch (error) {
    pushFinding(
      findings,
      "invalid_object_graph",
      pathField,
      error instanceof Error ? error.message : String(error),
    );
  }
  return result;
}

export function validateObjectGraphRoundTrip({ beforeGraph, afterGraph, manifest }) {
  const findings = [];
  if (!beforeGraph.graph || !afterGraph.graph) return findings;
  compareGraphMetric(beforeGraph.graph, afterGraph.graph, "slideCount", findings);
  compareGraphMetric(beforeGraph.graph, afterGraph.graph, "editableObjectCount", findings);
  const editedObjectFound = (afterGraph.graph.objects ?? []).some(
    (object) =>
      object?.slideId === manifest.editedSlideId && object?.objectId === manifest.editedObjectId,
  );
  if (!editedObjectFound) {
    pushFinding(findings, "edited_object_missing", "afterObjectGraphPath.objects");
  }
  return findings;
}

function compareGraphMetric(beforeGraph, afterGraph, field, findings) {
  const before = beforeGraph[field];
  const after = afterGraph[field];
  if (!Number.isFinite(before)) {
    pushFinding(findings, "invalid_object_graph_metric", `beforeObjectGraphPath.${field}`);
    return;
  }
  if (!Number.isFinite(after)) {
    pushFinding(findings, "invalid_object_graph_metric", `afterObjectGraphPath.${field}`);
    return;
  }
  if (after < before) {
    pushFinding(
      findings,
      "object_graph_regression",
      `afterObjectGraphPath.${field}`,
      `${after} < ${before}`,
    );
  }
}

function resolveManifestPath(manifestDir, filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(manifestDir, filePath);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pushFinding(findings, code, findingPath, detail = "") {
  findings.push({ code, path: findingPath, detail });
}
