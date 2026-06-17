export type Png2SvgRegressionSource = "manual_png2svg" | "deckforge_benchmark";
export type Png2SvgDiffStatus = "matched" | "changed";

export type Png2SvgRegressionFixture = {
  readonly id: string;
  readonly source: Png2SvgRegressionSource;
  readonly category: string;
  readonly originalPngPath: string;
  readonly expectedManifestPath: string;
  readonly expectedSvgPath: string;
  readonly expectedHybridSvgPath: string;
  readonly expectedManifestHash: string;
  readonly expectedVisualSnapshotHash: string;
  readonly expectedTextCandidateCount: number;
  readonly expectedRasterRegionCount: number;
  readonly expectedVisualRegionCount: number;
  readonly failureConditions: readonly string[];
  readonly manualQaNotes: readonly string[];
};

export type Png2SvgRegressionCorpus = {
  readonly version: string;
  readonly minFixtureCount: 20;
  readonly fixtures: readonly Png2SvgRegressionFixture[];
};

export type Png2SvgRegressionCoverage = {
  readonly textCandidates: boolean;
  readonly rasterRegions: boolean;
  readonly visualRegions: boolean;
  readonly hybridSafe: boolean;
};

export type Png2SvgCorpusValidationReport = {
  readonly fixtureCount: number;
  readonly coverage: Png2SvgRegressionCoverage;
  readonly duplicateIds: readonly string[];
  readonly issues: readonly string[];
  readonly passed: boolean;
};

export type Png2SvgFixtureActual = {
  readonly fixtureId: string;
  readonly manifestHash: string;
  readonly visualSnapshotHash: string;
  readonly textCandidateCount: number;
  readonly rasterRegionCount: number;
  readonly visualRegionCount: number;
  readonly hybridSvgPath: string;
};

export type Png2SvgFixtureDiff = {
  readonly fixtureId: string;
  readonly visualDiff: {
    readonly status: Png2SvgDiffStatus;
    readonly expectedHash: string;
    readonly actualHash: string;
  };
  readonly metadataDiff: {
    readonly status: Png2SvgDiffStatus;
    readonly changedFields: readonly string[];
  };
  readonly compares: Png2SvgRegressionCoverage;
};

export type Png2SvgFixtureDiffReport = {
  readonly corpusVersion: string;
  readonly totalFixtures: number;
  readonly fixtureDiffs: readonly Png2SvgFixtureDiff[];
  readonly passed: boolean;
};
