import * as finalExportGate from "./live-release-final-export-gate";
import type { LiveReleaseBlocker } from "./live-release-gate";
import {
  collectLineageContamination,
  type ProviderArtifactProvenance,
} from "./provider-provenance";

export function lineageBlockers(
  lineage: readonly ProviderArtifactProvenance[],
  finalExportArtifactId: string,
): readonly LiveReleaseBlocker[] {
  if (lineage.length === 0) {
    return [
      blocker("golden_path_lineage_missing", "Golden Path lineage evidence is required.", [
        "DF-241",
      ]),
    ];
  }
  const expectedFinalExportId = finalExportArtifactId.trim();
  const hasCanonicalFinalExportId =
    expectedFinalExportId.length > 0 &&
    expectedFinalExportId === finalExportArtifactId &&
    finalExportGate.hasLiveFinalExportArtifactId(expectedFinalExportId);
  const finalExportLineage = hasCanonicalFinalExportId
    ? lineage.filter((item) => item.artifactId === expectedFinalExportId)
    : [];
  const includesFinalExport = finalExportLineage.length > 0;
  const includesLiveFinalExport = finalExportLineage.some(
    finalExportGate.hasLiveFinalExportLineageArtifact,
  );
  const contamination = collectLineageContamination(lineage);
  const refs = [...contamination.mockArtifactIds, ...contamination.fixtureArtifactIds];
  return [
    ...(includesFinalExport
      ? []
      : [
          blocker(
            "golden_path_export_missing",
            "Golden Path lineage must include the final export artifact.",
            [expectedFinalExportId || "final export artifact"],
          ),
        ]),
    ...(includesFinalExport && !includesLiveFinalExport
      ? [
          blocker(
            "golden_path_export_not_live",
            "Golden Path final export lineage must come from a production Codex session.",
            finalExportLineage.map(finalExportGate.formatFinalExportLineageRef),
          ),
        ]
      : []),
    ...(refs.length === 0
      ? []
      : [
          blocker(
            "golden_path_contaminated",
            "Golden Path lineage must contain zero mock or fixture artifacts.",
            refs,
          ),
        ]),
  ];
}

function blocker(
  code: LiveReleaseBlocker["code"],
  message: string,
  refs: readonly string[],
): LiveReleaseBlocker {
  return { code, message, refs };
}
