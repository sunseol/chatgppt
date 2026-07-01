import { describe, expect, test } from "bun:test";
import type { DeckProject, ProjectExportSummary } from "./deck-types";
import { evaluateFinalExportGate } from "./final-export-gate";
import { createProviderArtifactProvenance } from "./provider-provenance";

describe("final export gate", () => {
  test("blocks final export when outputs are invalidated", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture({ invalidated: { layout: true } }),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(),
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues[0]?.code).toBe("invalidated_artifact");
    expect(result.issues[0]?.step).toBe("layout");
  });

  test("blocks final export without complete report and file artifacts", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture(),
      exportPackage: {
        ...exportSummaryFixture(),
        pngCount: 0,
        svgCount: 0,
        hybridSvgCount: 0,
        projectFilePath: "",
      },
      reportMarkdown: "# Draft",
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_png_export",
      "missing_svg_export",
      "missing_hybrid_svg_export",
      "missing_project_file",
      "missing_generation_report",
    ]);
  });

  test("blocks final export when fatal workflow errors remain", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture({
        workflowErrors: [
          {
            id: "err_transform",
            kind: "transform",
            stage: "vectorize",
            cause: "Editable layer graph is inconsistent.",
            retryable: false,
            recoveryAction: "레이어 변환을 다시 실행하세요.",
            blocksFinalApproval: true,
          },
        ],
      }),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(),
    });

    expect(result.kind).toBe("blocked");
    if (result.kind === "blocked") {
      expect(result.issues[0]?.code).toBe("fatal_workflow_error");
    }
  });

  test("blocks production export when lineage contains mock artifacts", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture(),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(),
      executionMode: "production",
      lineage: [
        createProviderArtifactProvenance({
          artifactId: "mock_slide_1",
          executionMode: "production",
          providerKind: "mock",
          authMode: "none",
          modelOrRuntime: "mock-provider",
          promptVersion: "slide_generation@v1",
          durationMs: 1,
          inputArtifactIds: ["layout_001"],
          fixture: true,
        }),
      ],
    });

    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code).includes("mock_lineage_contamination")).toBe(
      true,
    );
    expect(result.issues[0]?.artifactId).toBe("mock_slide_1");
    expect(result.issues[0]?.upstreamArtifactIds).toEqual(["layout_001"]);
  });

  test("allows development export only with contamination warnings and a mock watermark", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture(),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(),
      executionMode: "development",
      lineage: [
        createProviderArtifactProvenance({
          artifactId: "mock_slide_1",
          executionMode: "development",
          providerKind: "mock",
          authMode: "none",
          modelOrRuntime: "mock-provider",
          promptVersion: "slide_generation@v1",
          durationMs: 1,
          inputArtifactIds: ["layout_001"],
          fixture: true,
        }),
      ],
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.developmentWatermark).toBe("MOCK MODE");
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "development_mock_lineage",
      "development_fixture_lineage",
    ]);
    expect(result.warnings[0]?.artifactId).toBe("mock_slide_1");
    expect(result.warnings[0]?.upstreamArtifactIds).toEqual(["layout_001"]);
  });

  test("allows final export when report references a complete export package", () => {
    const result = evaluateFinalExportGate({
      project: projectFixture(),
      exportPackage: exportSummaryFixture(),
      reportMarkdown: reportFixture(),
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.exportArtifactId).toBe("project_001_export_v1");
    expect(result.exportArtifactHash).toBe("sha256:export");
    expect(result.reportHash.startsWith("sha256:")).toBe(true);
  });
});

function projectFixture(
  input: {
    readonly invalidated?: DeckProject["invalidated"];
    readonly workflowErrors?: DeckProject["workflowErrors"];
  } = {},
): DeckProject {
  return {
    id: "project_001",
    name: "Gate Fixture",
    initialPrompt: "Build a deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "FINAL_REPORTING",
    createdAt: 1_000,
    updatedAt: 2_000,
    invalidated: input.invalidated ?? {},
    ...(input.workflowErrors === undefined ? {} : { workflowErrors: input.workflowErrors }),
    approvalLog: [],
  };
}

function exportSummaryFixture(): ProjectExportSummary {
  return {
    artifactId: "project_001_export_v1",
    artifactHash: "sha256:export",
    artifactPath: "projects/project_001/exports/export.v1.json",
    createdAt: 2_000,
    pngCount: 1,
    svgCount: 1,
    hybridSvgCount: 1,
    projectFilePath: "projects/project_001/exports/project_001.deckforge.json",
  };
}

function reportFixture(): string {
  return [
    "# Generation Report — Gate Fixture",
    "",
    "## 9. 사용된 프롬프트 버전",
    "",
    "## 10. Export 패키지",
    "- Export: project_001_export_v1 · sha256:export",
  ].join("\n");
}
