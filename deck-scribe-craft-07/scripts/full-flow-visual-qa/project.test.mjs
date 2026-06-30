import { describe, expect, test } from "bun:test";
import { visualQaProject } from "./project.mjs";
import { evaluateFinalExportGate } from "../../src/lib/final-export-gate.ts";
import { buildGenerationReport } from "../../src/lib/generation-report.ts";
import { buildLiveGenerationReportLineage } from "../../src/lib/live-generation-report-lineage-builder.ts";
import { buildProjectExportPackage } from "../../src/lib/project-export.ts";

describe("full-flow visual QA project", () => {
  test("covers the production-ready export lineage path", () => {
    const exportResult = buildProjectExportPackage(visualQaProject, {
      now: () => visualQaProject.updatedAt,
      version: 1,
    });

    expect(exportResult.kind).toBe("ready");
    if (exportResult.kind !== "ready") return;
    const liveReportLineage = buildLiveGenerationReportLineage({
      project: visualQaProject,
      exportPackage: exportResult.package,
    });
    const reportProject = {
      ...visualQaProject,
      exportPackage: exportResult.package.summary,
    };
    const report = buildGenerationReport(
      reportProject,
      undefined,
      [],
      visualQaProject.liveSlideGeneration?.providerLineage ?? [],
      liveReportLineage,
    );
    const gate = evaluateFinalExportGate({
      project: visualQaProject,
      exportPackage: exportResult.package.summary,
      reportMarkdown: report,
      executionMode: "production",
      lineage: visualQaProject.liveSlideGeneration?.providerLineage,
      liveReportLineage,
    });

    expect(liveReportLineage.map((slide) => slide.slideNumber)).toEqual([1, 2]);
    expect(gate.kind).toBe("ready");
  });
});
