import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const GENERATION_REPORT_LINEAGE_DOC = new URL(
  "../../docs/live-generation-report-lineage.md",
  import.meta.url,
);

describe("live generation report lineage documentation", () => {
  test("records the live generation report lineage and export provenance contract", () => {
    const generationReportLineage = readFileSync(GENERATION_REPORT_LINEAGE_DOC, "utf8");

    expect(generationReportLineage.includes("DF-240")).toBe(true);
    expect(generationReportLineage.includes("text turn")).toBe(true);
    expect(generationReportLineage.includes("image request")).toBe(true);
    expect(generationReportLineage.includes("nonblank source ids")).toBe(true);
    expect(generationReportLineage.includes("duplicate source ids")).toBe(true);
    expect(generationReportLineage.includes("blank evidence ids")).toBe(true);
    expect(generationReportLineage.includes("missing_live_report_lineage")).toBe(true);
    expect(generationReportLineage.includes("duplicate_slide_lineage")).toBe(true);
    expect(generationReportLineage.includes("duplicate_text_turn")).toBe(true);
    expect(generationReportLineage.includes("missing_text_prompt_version")).toBe(true);
    expect(generationReportLineage.includes("missing_text_artifact")).toBe(true);
    expect(generationReportLineage.includes("duplicate_text_artifact")).toBe(true);
    expect(generationReportLineage.includes("missing_image_artifact")).toBe(true);
    expect(generationReportLineage.includes("duplicate_image_artifact")).toBe(true);
    expect(generationReportLineage.includes("*_image_slide_###_vN")).toBe(true);
    expect(generationReportLineage.includes("duplicate_image_request")).toBe(true);
    expect(generationReportLineage.includes("duplicate_export_hash")).toBe(true);
    expect(generationReportLineage.includes("missing_text_provider_lineage")).toBe(true);
    expect(generationReportLineage.includes("missing_image_provider_lineage")).toBe(true);
    expect(generationReportLineage.includes("text_provider_auth_mismatch")).toBe(true);
    expect(generationReportLineage.includes("image_provider_auth_mismatch")).toBe(true);
    expect(generationReportLineage.includes("text_provider_lineage_mismatch")).toBe(true);
    expect(generationReportLineage.includes("text_prompt_version_mismatch")).toBe(true);
    expect(generationReportLineage.includes("image_provider_lineage_mismatch")).toBe(true);
    expect(generationReportLineage.includes("missing_live_report_lineage_section")).toBe(true);
    expect(generationReportLineage.includes("buildGenerationReport")).toBe(true);
    expect(generationReportLineage.includes("invalid_compositor_hash")).toBe(true);
    expect(generationReportLineage.includes("invalid_export_hash")).toBe(true);
    expect(generationReportLineage.includes("invalid_export_artifact_path")).toBe(true);
    expect(generationReportLineage.includes("invalid_project_file_path")).toBe(true);
    expect(generationReportLineage.includes("invalid_export_artifact_hash")).toBe(true);
    expect(generationReportLineage.includes("full SHA-256 artifact digest")).toBe(true);
    expect(generationReportLineage.includes("final-export-gate-export-path.test.ts")).toBe(true);
    expect(generationReportLineage.includes("export_compositor_mismatch")).toBe(true);
    expect(generationReportLineage.includes("mock_lineage_contamination")).toBe(true);
    expect(generationReportLineage.includes("exported project content")).toBe(true);
    expect(generationReportLineage.includes("report markdown")).toBe(true);
    expect(generationReportLineage.includes("sidecar lineage")).toBe(true);
    expect(generationReportLineage.includes("final-export-report-gate.ts")).toBe(true);
    expect(generationReportLineage.includes("secret_leak")).toBe(true);
  });
});
