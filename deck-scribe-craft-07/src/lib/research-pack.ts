import type { ArtifactRecord } from "./artifacts";
import { createArtifactRecord } from "./artifacts";
import type { LiveWebSearchEvidence } from "./live-web-search-evidence";
import { parseResearchPack } from "./research-pack-schema";
import type {
  Claim,
  FactCheckIssue,
  FactCheckReport,
  NumericEvidence,
  ResearchChart,
  ResearchDataset,
  ResearchDatasetRow,
  ResearchPack,
  ResearchReinforcementRequest,
  ResearchSourceCaptureMetadata,
  Source,
} from "./research-types";
import type { LiveResearchEvidenceReference } from "./live-research-evidence";
import type { ProviderArtifactProvenance } from "./provider-provenance";

export { parseResearchPack } from "./research-pack-schema";
export {
  LiveResearchEvidenceReferenceSchema,
  LiveWebSearchEvidenceSchema,
  ProviderArtifactProvenanceSchema,
} from "./research-pack-live-schema";
export {
  ClaimSchema,
  FactCheckIssueSchema,
  FactCheckReportSchema,
  NumericEvidenceSchema,
  ResearchChartSchema,
  ResearchDatasetRowSchema,
  ResearchDatasetSchema,
  ResearchPackSchema,
  ResearchReviewStateSchema,
  ResearchSourceCaptureMetadataSchema,
  SourceSchema,
} from "./research-pack-schema";

export interface ApprovedResearchPackArtifact {
  readonly record: ArtifactRecord;
  readonly pack: ImmutableResearchPack;
}

export interface ApproveResearchPackInput {
  readonly projectId: string;
  readonly pack: ResearchPack;
  readonly version: number;
  readonly approvedAt: number;
}

export type ImmutableResearchPack = Readonly<
  Omit<
    ResearchPack,
    | "sources"
    | "claims"
    | "datasets"
    | "charts"
    | "factCheckReport"
    | "webSearchEvidence"
    | "liveEvidenceRefs"
    | "provenanceLineage"
  >
> & {
  readonly sources: readonly ImmutableSource[];
  readonly claims: readonly ImmutableClaim[];
  readonly datasets: readonly ImmutableResearchDataset[];
  readonly charts: readonly ImmutableResearchChart[];
  readonly factCheckReport: ImmutableFactCheckReport;
  readonly webSearchEvidence?: Readonly<LiveWebSearchEvidence>;
  readonly liveEvidenceRefs?: readonly Readonly<LiveResearchEvidenceReference>[];
  readonly provenanceLineage?: readonly Readonly<ProviderArtifactProvenance>[];
  readonly review?: ImmutableResearchReviewState;
};

type ImmutableSource = Readonly<Omit<Source, "capture" | "captureHistory">> & {
  readonly capture?: Readonly<ResearchSourceCaptureMetadata>;
  readonly captureHistory?: readonly Readonly<ResearchSourceCaptureMetadata>[];
};

type ImmutableClaim = Readonly<
  Omit<Claim, "sourceIds" | "datasetIds" | "slideCandidates" | "numericEvidence">
> & {
  readonly sourceIds: readonly string[];
  readonly datasetIds: readonly string[];
  readonly slideCandidates: readonly number[];
  readonly numericEvidence: readonly Readonly<NumericEvidence>[];
};

type ImmutableResearchDataset = Readonly<Omit<ResearchDataset, "sourceIds" | "rows">> & {
  readonly sourceIds: readonly string[];
  readonly rows: readonly Readonly<ResearchDatasetRow>[];
};

type ImmutableResearchChart = Readonly<Omit<ResearchChart, "sourceIds" | "slideCandidates">> & {
  readonly sourceIds: readonly string[];
  readonly slideCandidates: readonly number[];
};

type ImmutableFactCheckReport = Readonly<Omit<FactCheckReport, "issues" | "uncertainItems">> & {
  readonly issues: readonly Readonly<FactCheckIssue>[];
  readonly uncertainItems: readonly string[];
};

type ImmutableResearchReviewState = {
  readonly sourceDecisions: readonly Readonly<
    NonNullable<ResearchPack["review"]>["sourceDecisions"][number]
  >[];
  readonly reinforcementRequests: readonly Readonly<ResearchReinforcementRequest>[];
};

export function createApprovedResearchPackArtifact(
  input: ApproveResearchPackInput,
): ApprovedResearchPackArtifact {
  const pack = cloneImmutableResearchPack(parseResearchPack(input.pack));
  const record = createArtifactRecord({
    projectId: input.projectId,
    type: "research",
    version: input.version,
    content: JSON.stringify(pack),
    createdAt: input.approvedAt,
  });
  return Object.freeze({ record, pack });
}

function cloneImmutableResearchPack(pack: ResearchPack): ImmutableResearchPack {
  return Object.freeze({
    id: pack.id,
    sources: Object.freeze(pack.sources.map(freezeSource)),
    claims: Object.freeze(pack.claims.map(freezeClaim)),
    datasets: Object.freeze(pack.datasets.map(freezeDataset)),
    charts: Object.freeze(pack.charts.map(freezeChart)),
    factCheckReport: freezeFactCheckReport(pack.factCheckReport),
    ...(pack.webSearchEvidence === undefined
      ? {}
      : { webSearchEvidence: freezeLiveWebSearchEvidence(pack.webSearchEvidence) }),
    ...(pack.liveEvidenceRefs === undefined
      ? {}
      : { liveEvidenceRefs: Object.freeze(pack.liveEvidenceRefs.map(freezeLiveEvidenceRef)) }),
    ...(pack.provenanceLineage === undefined
      ? {}
      : { provenanceLineage: Object.freeze(pack.provenanceLineage.map(freezeProvenance)) }),
    ...(pack.review === undefined ? {} : { review: freezeResearchReviewState(pack.review) }),
    ...(pack.approvedHash === undefined ? {} : { approvedHash: pack.approvedHash }),
  });
}

function freezeSource(source: Source): ImmutableSource {
  return Object.freeze({
    ...source,
    ...(source.capture === undefined ? {} : { capture: freezeSourceCapture(source.capture) }),
    ...(source.captureHistory === undefined
      ? {}
      : { captureHistory: Object.freeze(source.captureHistory.map(freezeSourceCapture)) }),
  });
}

function freezeSourceCapture(
  capture: ResearchSourceCaptureMetadata,
): Readonly<ResearchSourceCaptureMetadata> {
  return Object.freeze({ ...capture });
}

function freezeClaim(claim: Claim): ImmutableClaim {
  return Object.freeze({
    ...claim,
    sourceIds: Object.freeze([...claim.sourceIds]),
    datasetIds: Object.freeze([...claim.datasetIds]),
    slideCandidates: Object.freeze([...claim.slideCandidates]),
    numericEvidence: Object.freeze(claim.numericEvidence.map(freezeNumericEvidence)),
  });
}

function freezeNumericEvidence(evidence: NumericEvidence): Readonly<NumericEvidence> {
  return Object.freeze({ ...evidence });
}

function freezeDataset(dataset: ResearchDataset): ImmutableResearchDataset {
  return Object.freeze({
    ...dataset,
    sourceIds: Object.freeze([...dataset.sourceIds]),
    rows: Object.freeze(dataset.rows.map(freezeDatasetRow)),
  });
}

function freezeDatasetRow(row: ResearchDatasetRow): Readonly<ResearchDatasetRow> {
  return Object.freeze({ ...row });
}

function freezeChart(chart: ResearchChart): ImmutableResearchChart {
  return Object.freeze({
    ...chart,
    sourceIds: Object.freeze([...chart.sourceIds]),
    slideCandidates: Object.freeze([...chart.slideCandidates]),
  });
}

function freezeFactCheckReport(report: FactCheckReport): ImmutableFactCheckReport {
  return Object.freeze({
    ...report,
    issues: Object.freeze(report.issues.map(freezeFactCheckIssue)),
    uncertainItems: Object.freeze([...report.uncertainItems]),
  });
}

function freezeFactCheckIssue(issue: FactCheckIssue): Readonly<FactCheckIssue> {
  return Object.freeze({ ...issue });
}

function freezeLiveWebSearchEvidence(
  evidence: LiveWebSearchEvidence,
): Readonly<LiveWebSearchEvidence> {
  return Object.freeze({
    ...evidence,
    queries: Object.freeze([...evidence.queries]),
    candidates: Object.freeze(
      evidence.candidates.map((candidate) => Object.freeze({ ...candidate })),
    ),
    latestnessBenchmark: Object.freeze({
      ...evidence.latestnessBenchmark,
      candidateIds: Object.freeze([...evidence.latestnessBenchmark.candidateIds]),
    }),
  });
}

function freezeLiveEvidenceRef(
  evidenceRef: LiveResearchEvidenceReference,
): Readonly<LiveResearchEvidenceReference> {
  return Object.freeze({ ...evidenceRef });
}

function freezeProvenance(
  provenance: ProviderArtifactProvenance,
): Readonly<ProviderArtifactProvenance> {
  return Object.freeze({
    ...provenance,
    inputArtifactIds: Object.freeze([...provenance.inputArtifactIds]),
  });
}

function freezeResearchReviewState(
  review: NonNullable<ResearchPack["review"]>,
): ImmutableResearchReviewState {
  return Object.freeze({
    sourceDecisions: Object.freeze(
      review.sourceDecisions.map((decision) => Object.freeze({ ...decision })),
    ),
    reinforcementRequests: Object.freeze(
      review.reinforcementRequests.map((request) => Object.freeze({ ...request })),
    ),
  });
}
