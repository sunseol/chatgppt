import type { LiveBenchmarkEvidenceBundle } from "../src/lib/live-benchmark-evidence";
import { LIVE_BENCHMARK_IDS, type LiveBenchmarkRun } from "../src/lib/live-benchmark-evidence";
import type { LiveGoldenPathE2EBundle } from "../src/lib/live-golden-path-e2e";
import type { LiveGoldenPathE2EStep } from "../src/lib/live-golden-path-e2e-contract";
import { hashContent } from "../src/lib/artifacts";
import { createProviderArtifactProvenance } from "../src/lib/provider-provenance";

export type Df241Df242CandidateInputs = {
  readonly packageArchiveSha256: string;
};

export type Df241Df242CandidateEvidence = {
  readonly goldenPathBundle: LiveGoldenPathE2EBundle;
  readonly benchmarkBundle: LiveBenchmarkEvidenceBundle;
};

export function buildDf241Df242CandidateEvidence(
  inputs: Df241Df242CandidateInputs,
): Df241Df242CandidateEvidence {
  const goldenPathBundle = buildGoldenPathBundle();
  return {
    goldenPathBundle,
    benchmarkBundle: {
      reportPath: "docs/live-benchmark-report.md",
      packageArchiveSha256: inputs.packageArchiveSha256,
      runs: LIVE_BENCHMARK_IDS.map((id) => blockedBenchmarkRun(id, inputs.packageArchiveSha256)),
    },
  };
}

function buildGoldenPathBundle(): LiveGoldenPathE2EBundle {
  const reportContent = [
    "DF-241/DF-242 current candidate assembled from existing live artifacts.",
    "This is not a signed packaged Golden Path pass.",
  ].join("\n");
  const sources = [
    {
      url: "https://ourworldindata.org/grapher/installed-solar-pv-capacity.csv",
      role: "official",
      artifactId: "src_solar_capacity",
    },
    {
      url: "https://ourworldindata.org/grapher/solar-pv-prices.csv",
      role: "primary",
      artifactId: "src_solar_module_cost",
    },
    {
      url: "https://api.worldbank.org/v2/country/WLD/indicator/EG.ELC.RNWX.ZS?format=json&per_page=10",
      role: "supporting",
      artifactId: "src_worldbank_renewable_ex_hydro",
    },
  ] as const;
  const imageArtifacts = [
    imageArtifact(1, "019ee689-3af0-7891-83f5-2f386f43c181", 56_466),
    imageArtifact(2, "019ee68a-214d-7be2-8984-b3461b1cf8db", 49_422),
    imageArtifact(3, "019ee68a-e53e-71c0-814a-8d5da527c75a", 30_413),
    imageArtifact(4, "019ee68b-5d5c-7a62-bf39-ae1c19bf4c41", 28_803),
    imageArtifact(5, "019ee68b-cf93-7dd3-9a6a-2a25cb63205a", 32_849),
    regeneratedImageArtifact(),
  ];
  return {
    projectId: "lane_e_live_text_20260621",
    finalExportArtifactId: "df240_live_final_export_project",
    completedSteps: completedCandidateSteps(),
    reportPath: "docs/live-evidence/release/df241-df242-candidate-20260622/live_e2e_report.md",
    reportContent,
    reportSignature: {
      signer: "",
      signedAt: "",
      digest: hashContent(reportContent),
    },
    screenshots: [],
    recordingPath: "",
    finalValidationBundle: {
      path: "",
      finalExportArtifactId: "",
      reportDigest: "",
      screenshotPaths: [],
      recordingPath: "",
      sourceArtifactIds: [],
      imageArtifactIds: [],
    },
    restartReopen: { projectId: "", reopenedAt: "", exportArtifactId: "" },
    sources,
    lineage: [
      textArtifact(
        "lane_e_live_interview_questions",
        "live_interview@v1",
        "019ee6ab-a9dd-7c10-809e-c1e5799ad8f4",
        11_704,
      ),
      textArtifact(
        "lane_e_live_research",
        "live_research@v1",
        "019ee6a8-5136-70a3-b3aa-9ebc22f86286",
        1,
      ),
      textArtifact(
        "lane_e_live_deck_plan",
        "live_deck_plan@v1",
        "019ee6ac-ab9b-79b1-84a0-7459ccc9f4e2",
        51_947,
      ),
      textArtifact(
        "lane_e_live_design_system",
        "live_design_system@v1",
        "019ee6ad-77b7-76d2-a2ab-8b6844e93623",
        97_533,
      ),
      textArtifact(
        "lane_e_live_layout_ir",
        "live_layout_ir@v1",
        "019ee6af-e7a7-74a0-b469-074a261db193",
        0,
      ),
      ...imageArtifacts,
    ],
    imageArtifacts,
  };
}

function completedCandidateSteps(): readonly LiveGoldenPathE2EStep[] {
  return [
    "live_interview",
    "live_research",
    "live_deck_plan",
    "live_design_system",
    "live_layout_ir",
    "live_image_generation",
    "live_slide_regeneration",
    "export",
  ];
}

function textArtifact(
  artifactId: string,
  promptVersion: string,
  turnId: string,
  durationMs: number,
) {
  return createProviderArtifactProvenance({
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex app-server --stdio 0.141.0",
    promptVersion,
    durationMs,
    inputArtifactIds: [],
    fixture: false,
    threadId: "019ee6ab-9437-7520-9e6f-5bdd58b6bd41",
    turnId,
  });
}

function imageArtifact(slideNumber: number, turnId: string, durationMs: number) {
  const slideId = String(slideNumber).padStart(3, "0");
  return createProviderArtifactProvenance({
    artifactId: `df232_live_codex_batch_image_slide_${slideId}_v1`,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "gpt-image-2",
    promptVersion: "slide_generation@codex-live-batch-v1",
    durationMs,
    inputArtifactIds: [
      `sha256:df232-live-slide-${slideId}-prompt`,
      `live-layout-reference/df232-slide-${slideId}-composition.png`,
    ],
    fixture: false,
    threadId: "019ee689-3814-73e3-bf80-3ff0fc6e1d44",
    turnId,
  });
}

function regeneratedImageArtifact() {
  return createProviderArtifactProvenance({
    artifactId: "df235_live_regeneration_lineage_20260622_image_slide_003_v2",
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "gpt-image-2",
    promptVersion: "slide_generation@v1",
    durationMs: 289_310,
    inputArtifactIds: [
      "sha256:3334a742",
      "slide_03_layout.png",
      "df232_live_codex_batch_image_slide_003_v1",
    ],
    fixture: false,
    threadId: "019eec4f-4a6c-7832-823f-b70616583b4a",
    turnId: "019eec4f-4ce2-7a20-88a8-41c18590e7d7",
  });
}

function blockedBenchmarkRun(
  id: (typeof LIVE_BENCHMARK_IDS)[number],
  packageArchiveSha256: string,
): LiveBenchmarkRun {
  return {
    id,
    status: "blocked",
    failureDomain: "context",
    source: "live",
    score: 0,
    mockScore: 0,
    goldenPathCompleted: false,
    outputBundlePath: "",
    outputBundle: {
      path: "",
      benchmarkId: id,
      packageArchiveSha256,
      reportPath: "",
      goldenPathReportPath: "",
      exportArtifactId: "",
      screenshotCount: 0,
      screenshotPaths: [],
      sourceCount: 0,
      sourceArtifactIds: [],
      imageArtifactCount: 0,
      liveImageArtifactIds: [],
      regeneratedLiveImageArtifactIds: [],
      liveImageTurnIds: [],
      liveImageRequestIds: [],
    },
  };
}
