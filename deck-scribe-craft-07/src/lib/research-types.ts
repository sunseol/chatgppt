import type { LiveWebSearchEvidence } from "./live-web-search-evidence";
import type { LiveResearchEvidenceReference } from "./live-research-evidence";
import type { ProviderArtifactProvenance } from "./provider-provenance";

export type SourceGrade = "A" | "B" | "C" | "D" | "E";
export type UsableSourceGrade = "A" | "B" | "C" | "D";
export type ResearchSourceType =
  | "government"
  | "international"
  | "original_data"
  | "research"
  | "academic"
  | "company"
  | "media"
  | "industry"
  | "user_material";
export type SourceUsePolicy = "priority" | "allowed" | "supporting" | "restricted";
export type ClaimConfidence = "high" | "medium" | "low" | "assumption";
export type ClaimStatus = "supported" | "uncertain" | "assumption" | "conflicting";
export type ChartType = "bar" | "line" | "table";

export interface ResearchSourceCaptureMetadata {
  readonly originalUrl: string;
  readonly finalUrl: string;
  readonly fetchedAt: number;
  readonly mimeType: string;
  readonly statusCode: number;
  readonly contentHash: string;
  readonly rawArchivePath: string;
  readonly textArchivePath: string;
  readonly extractedTextHash: string;
  readonly version: number;
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  year: number;
  grade: UsableSourceGrade;
  sourceType: ResearchSourceType;
  usePolicy: SourceUsePolicy;
  url?: string;
  capture?: ResearchSourceCaptureMetadata;
  readonly captureHistory?: readonly ResearchSourceCaptureMetadata[];
}

export interface NumericEvidence {
  id: string;
  value: string;
  unit: string;
  baseYear: number;
  geography: string;
  definition: string;
  sourceId?: string;
  datasetId?: string;
  uncertain?: boolean;
}

export interface Claim {
  id: string;
  statement: string;
  sourceIds: string[];
  datasetIds: string[];
  confidence: ClaimConfidence;
  hasNumber: boolean;
  needsUserReview: boolean;
  status: ClaimStatus;
  slideCandidates: number[];
  numericEvidence: NumericEvidence[];
}

export interface ResearchDatasetRow {
  label: string;
  value: number;
  year?: number;
  segment?: string;
}

export interface ResearchDataset {
  id: string;
  title: string;
  sourceIds: string[];
  unit: string;
  period: string;
  geography: string;
  definition: string;
  rows: ResearchDatasetRow[];
  uncertain: boolean;
}

export interface ResearchChart {
  id: string;
  title: string;
  chartType: ChartType;
  datasetId: string;
  unit: string;
  period: string;
  sourceIds: string[];
  slideCandidates: number[];
  uncertain: boolean;
}

export interface FactCheckIssue {
  id: string;
  severity: "fatal" | "warning" | "info";
  message: string;
  claimId?: string;
  sourceId?: string;
  datasetId?: string;
  uncertain?: boolean;
}

export interface FactCheckReport {
  summary: string;
  generatedAt: number;
  fatalIssueCount: number;
  issues: FactCheckIssue[];
  uncertainItems: string[];
}

export type ResearchReviewSourceDecision = {
  readonly sourceId: string;
  readonly decision: "excluded";
  readonly reason: string;
  readonly decidedAt: number;
};

export type ResearchReinforcementStatus = "pending" | "resolved";

export type ResearchReinforcementRequest = {
  readonly id: string;
  readonly prompt: string;
  readonly status: ResearchReinforcementStatus;
  readonly requestedAt: number;
  readonly resolvedAt?: number;
};

export type ResearchReviewState = {
  readonly sourceDecisions: readonly ResearchReviewSourceDecision[];
  readonly reinforcementRequests: readonly ResearchReinforcementRequest[];
};

export interface ResearchPack {
  id: string;
  sources: Source[];
  claims: Claim[];
  datasets: ResearchDataset[];
  charts: ResearchChart[];
  factCheckReport: FactCheckReport;
  webSearchEvidence?: LiveWebSearchEvidence;
  liveEvidenceRefs?: LiveResearchEvidenceReference[];
  provenanceLineage?: ProviderArtifactProvenance[];
  review?: ResearchReviewState;
  approvedHash?: string;
}
