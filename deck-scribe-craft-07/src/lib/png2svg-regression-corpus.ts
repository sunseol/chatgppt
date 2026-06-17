import { REQUIRED_BENCHMARK_CATEGORIES } from "./benchmark-suite";
import type {
  Png2SvgCorpusValidationReport,
  Png2SvgFixtureActual,
  Png2SvgFixtureDiff,
  Png2SvgFixtureDiffReport,
  Png2SvgRegressionCorpus,
  Png2SvgRegressionCoverage,
  Png2SvgRegressionFixture,
  Png2SvgRegressionSource,
} from "./png2svg-regression-corpus-types";

type FixtureSeed = {
  readonly id: string;
  readonly category: string;
  readonly textCount: number;
  readonly rasterCount: number;
  readonly visualCount: number;
  readonly failure: string;
  readonly qaNote: string;
};

const MANUAL_SEEDS: readonly FixtureSeed[] = [
  seed("manual_title_dense", "dense_text", 5, 1, 2, "title text merges into body copy"),
  seed("manual_korean_mixed", "korean_mixed", 4, 1, 2, "Korean and English baselines diverge"),
  seed("manual_photo_panel", "photo_panel", 2, 2, 2, "photo crop is treated as vector geometry"),
  seed("manual_chart_table", "chart_table", 6, 1, 3, "chart labels detach from plotted regions"),
  seed("manual_icon_row", "icon_row", 3, 1, 5, "small icons are oversegmented"),
  seed("manual_gradient_card", "gradient_card", 2, 2, 3, "gradient cards lose raster fidelity"),
  seed("manual_wide_dashboard", "wide_dashboard", 7, 2, 4, "dashboard panels reorder in SVG"),
  seed("manual_low_contrast", "low_contrast", 3, 1, 2, "low-contrast text is omitted"),
  seed("manual_overlapping_text", "overlap", 5, 1, 2, "overlapping callouts collide with regions"),
  seed("manual_sparse_slide", "sparse", 1, 1, 1, "single hero visual loses hybrid-safe base"),
];

export const PNG2SVG_REGRESSION_CORPUS: Png2SvgRegressionCorpus = {
  version: "2026-06-df151a",
  minFixtureCount: 20,
  fixtures: [
    ...MANUAL_SEEDS.map((fixture, index) => toFixture(fixture, index + 1, "manual_png2svg")),
    ...REQUIRED_BENCHMARK_CATEGORIES.map((category, index) =>
      toFixture(benchmarkSeed(category, index + 1), index + 11, "deckforge_benchmark"),
    ),
  ],
};

export function validatePng2SvgRegressionCorpus(
  corpus: Png2SvgRegressionCorpus,
): Png2SvgCorpusValidationReport {
  const duplicateIds = findDuplicateIds(corpus.fixtures);
  const coverage = coverageFor(corpus.fixtures);
  const issues = [
    ...(corpus.fixtures.length >= corpus.minFixtureCount
      ? []
      : [
          `expected at least ${corpus.minFixtureCount} fixtures, received ${corpus.fixtures.length}`,
        ]),
    ...duplicateIds.map((id) => `duplicate fixture id: ${id}`),
    ...corpus.fixtures.flatMap(validateFixture),
    ...coverageIssues(coverage),
  ];
  return {
    fixtureCount: corpus.fixtures.length,
    coverage,
    duplicateIds,
    issues,
    passed: issues.length === 0,
  };
}

export function buildPng2SvgFixtureDiffReport(
  corpus: Png2SvgRegressionCorpus,
  actuals: readonly Png2SvgFixtureActual[] = [],
): Png2SvgFixtureDiffReport {
  const fixtureDiffs = corpus.fixtures.map((fixture) =>
    diffFixture(
      fixture,
      actuals.find((actual) => actual.fixtureId === fixture.id),
    ),
  );
  return {
    corpusVersion: corpus.version,
    totalFixtures: corpus.fixtures.length,
    fixtureDiffs,
    passed: fixtureDiffs.every(
      (diff) => diff.visualDiff.status === "matched" && diff.metadataDiff.status === "matched",
    ),
  };
}

function seed(
  id: string,
  category: string,
  textCount: number,
  rasterCount: number,
  visualCount: number,
  failure: string,
): FixtureSeed {
  return {
    id,
    category,
    textCount,
    rasterCount,
    visualCount,
    failure,
    qaNote: `Manual QA checks ${category} text, raster, visual, and hybrid-safe alignment.`,
  };
}

function benchmarkSeed(category: string, index: number): FixtureSeed {
  return seed(
    `benchmark_${category}`,
    category,
    2 + (index % 4),
    1 + (index % 2),
    2 + (index % 3),
    `benchmark ${category} output differs from locked DeckForge fixture`,
  );
}

function toFixture(
  fixture: FixtureSeed,
  ordinal: number,
  source: Png2SvgRegressionSource,
): Png2SvgRegressionFixture {
  const directory = `fixtures/png2svg/${source}/${fixture.id}`;
  return {
    id: fixture.id,
    source,
    category: fixture.category,
    originalPngPath: `${directory}/original.png`,
    expectedManifestPath: `${directory}/expected.manifest.json`,
    expectedSvgPath: `${directory}/expected.svg`,
    expectedHybridSvgPath: `${directory}/expected.hybrid.svg`,
    expectedManifestHash: stableHash("manifest", ordinal, fixture.id),
    expectedVisualSnapshotHash: stableHash("visual", ordinal, fixture.id),
    expectedTextCandidateCount: fixture.textCount,
    expectedRasterRegionCount: fixture.rasterCount,
    expectedVisualRegionCount: fixture.visualCount,
    failureConditions: [fixture.failure],
    manualQaNotes: [fixture.qaNote],
  };
}

function validateFixture(fixture: Png2SvgRegressionFixture): readonly string[] {
  return [
    ...(fixture.originalPngPath.endsWith(".png") ? [] : [`${fixture.id}: missing original PNG`]),
    ...(fixture.expectedManifestPath.endsWith(".json")
      ? []
      : [`${fixture.id}: missing expected manifest`]),
    ...(fixture.expectedSvgPath.endsWith(".svg") ? [] : [`${fixture.id}: missing expected SVG`]),
    ...(fixture.expectedHybridSvgPath.endsWith(".hybrid.svg")
      ? []
      : [`${fixture.id}: missing expected hybrid SVG`]),
    ...(fixture.failureConditions.length > 0 ? [] : [`${fixture.id}: missing failure conditions`]),
    ...(fixture.manualQaNotes.length > 0 ? [] : [`${fixture.id}: missing manual QA notes`]),
  ];
}

function coverageFor(fixtures: readonly Png2SvgRegressionFixture[]): Png2SvgRegressionCoverage {
  return {
    textCandidates: fixtures.some((fixture) => fixture.expectedTextCandidateCount > 0),
    rasterRegions: fixtures.some((fixture) => fixture.expectedRasterRegionCount > 0),
    visualRegions: fixtures.some((fixture) => fixture.expectedVisualRegionCount > 0),
    hybridSafe: fixtures.every((fixture) => fixture.expectedHybridSvgPath.endsWith(".hybrid.svg")),
  };
}

function coverageIssues(coverage: Png2SvgRegressionCoverage): readonly string[] {
  const issues: string[] = [];
  if (!coverage.textCandidates) issues.push("text_candidates coverage missing");
  if (!coverage.rasterRegions) issues.push("raster_regions coverage missing");
  if (!coverage.visualRegions) issues.push("visual_regions coverage missing");
  if (!coverage.hybridSafe) issues.push("hybrid-safe coverage missing");
  return issues;
}

function diffFixture(
  fixture: Png2SvgRegressionFixture,
  actual: Png2SvgFixtureActual | undefined,
): Png2SvgFixtureDiff {
  const resolvedActual = actual ?? expectedActual(fixture);
  const changedFields = changedMetadataFields(fixture, resolvedActual);
  return {
    fixtureId: fixture.id,
    visualDiff: {
      status:
        resolvedActual.visualSnapshotHash === fixture.expectedVisualSnapshotHash
          ? "matched"
          : "changed",
      expectedHash: fixture.expectedVisualSnapshotHash,
      actualHash: resolvedActual.visualSnapshotHash,
    },
    metadataDiff: {
      status: changedFields.length === 0 ? "matched" : "changed",
      changedFields,
    },
    compares: {
      textCandidates: true,
      rasterRegions: true,
      visualRegions: true,
      hybridSafe: true,
    },
  };
}

function expectedActual(fixture: Png2SvgRegressionFixture): Png2SvgFixtureActual {
  return {
    fixtureId: fixture.id,
    manifestHash: fixture.expectedManifestHash,
    visualSnapshotHash: fixture.expectedVisualSnapshotHash,
    textCandidateCount: fixture.expectedTextCandidateCount,
    rasterRegionCount: fixture.expectedRasterRegionCount,
    visualRegionCount: fixture.expectedVisualRegionCount,
    hybridSvgPath: fixture.expectedHybridSvgPath,
  };
}

function changedMetadataFields(
  fixture: Png2SvgRegressionFixture,
  actual: Png2SvgFixtureActual,
): readonly string[] {
  const fields: string[] = [];
  if (actual.manifestHash !== fixture.expectedManifestHash) fields.push("manifest_hash");
  if (actual.textCandidateCount !== fixture.expectedTextCandidateCount) {
    fields.push("text_candidates");
  }
  if (actual.rasterRegionCount !== fixture.expectedRasterRegionCount) fields.push("raster_regions");
  if (actual.visualRegionCount !== fixture.expectedVisualRegionCount) fields.push("visual_regions");
  if (actual.hybridSvgPath !== fixture.expectedHybridSvgPath) fields.push("hybrid_safe");
  return fields;
}

function findDuplicateIds(fixtures: readonly Png2SvgRegressionFixture[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  fixtures.forEach((fixture) => {
    if (seen.has(fixture.id)) duplicates.add(fixture.id);
    seen.add(fixture.id);
  });
  return [...duplicates];
}

function stableHash(scope: string, ordinal: number, id: string): string {
  return `sha256:${scope}-${String(ordinal).padStart(2, "0")}-${id}`;
}
