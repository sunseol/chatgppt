import { describe, expect, test } from "bun:test";
import {
  PNG2SVG_REGRESSION_CORPUS,
  buildPng2SvgFixtureDiffReport,
  validatePng2SvgRegressionCorpus,
} from "./png2svg-regression-corpus";

describe("PNG2SVG regression corpus", () => {
  test("defines at least twenty unique fixtures", () => {
    const fixtureIds = PNG2SVG_REGRESSION_CORPUS.fixtures.map((fixture) => fixture.id);

    expect(PNG2SVG_REGRESSION_CORPUS.fixtures.length >= 20).toBe(true);
    expect(new Set(fixtureIds).size).toBe(fixtureIds.length);
  });

  test("records required artifact paths, failure conditions, and manual QA notes", () => {
    for (const fixture of PNG2SVG_REGRESSION_CORPUS.fixtures) {
      expect(fixture.originalPngPath.endsWith(".png")).toBe(true);
      expect(fixture.expectedManifestPath.endsWith(".json")).toBe(true);
      expect(fixture.expectedSvgPath.endsWith(".svg")).toBe(true);
      expect(fixture.expectedHybridSvgPath.endsWith(".hybrid.svg")).toBe(true);
      expect(fixture.failureConditions.length > 0).toBe(true);
      expect(fixture.manualQaNotes.length > 0).toBe(true);
    }
  });

  test("validates comparison coverage across PNG2SVG outputs", () => {
    const report = validatePng2SvgRegressionCorpus(PNG2SVG_REGRESSION_CORPUS);

    expect(report.passed).toBe(true);
    expect(report.fixtureCount >= 20).toBe(true);
    expect(report.coverage).toEqual({
      textCandidates: true,
      rasterRegions: true,
      visualRegions: true,
      hybridSafe: true,
    });
    expect(report.issues).toEqual([]);
  });

  test("builds fixture-level visual and metadata diff records", () => {
    const report = buildPng2SvgFixtureDiffReport(PNG2SVG_REGRESSION_CORPUS);

    expect(report.totalFixtures).toBe(PNG2SVG_REGRESSION_CORPUS.fixtures.length);
    expect(report.fixtureDiffs.length).toBe(PNG2SVG_REGRESSION_CORPUS.fixtures.length);
    expect(
      report.fixtureDiffs.every(
        (diff) =>
          diff.compares.textCandidates &&
          diff.compares.rasterRegions &&
          diff.compares.visualRegions &&
          diff.compares.hybridSafe,
      ),
    ).toBe(true);
    expect(report.fixtureDiffs.every((diff) => diff.visualDiff.status === "matched")).toBe(true);
    expect(report.fixtureDiffs.every((diff) => diff.metadataDiff.status === "matched")).toBe(true);
  });

  test("surfaces changed visual hashes and metadata counts", () => {
    const fixture = PNG2SVG_REGRESSION_CORPUS.fixtures[0];
    const report = buildPng2SvgFixtureDiffReport(PNG2SVG_REGRESSION_CORPUS, [
      {
        fixtureId: fixture.id,
        manifestHash: fixture.expectedManifestHash,
        visualSnapshotHash: "sha256:changed-visual",
        textCandidateCount: fixture.expectedTextCandidateCount + 1,
        rasterRegionCount: fixture.expectedRasterRegionCount,
        visualRegionCount: fixture.expectedVisualRegionCount,
        hybridSvgPath: fixture.expectedHybridSvgPath,
      },
    ]);
    const firstDiff = report.fixtureDiffs[0];

    expect(firstDiff?.visualDiff.status).toBe("changed");
    expect(firstDiff?.metadataDiff.status).toBe("changed");
    expect(firstDiff?.metadataDiff.changedFields.includes("text_candidates")).toBe(true);
  });
});
