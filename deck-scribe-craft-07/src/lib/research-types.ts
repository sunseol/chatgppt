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

export interface Source {
  id: string;
  title: string;
  publisher: string;
  year: number;
  grade: UsableSourceGrade;
  sourceType: ResearchSourceType;
  usePolicy: SourceUsePolicy;
  url?: string;
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

export interface ResearchPack {
  id: string;
  sources: Source[];
  claims: Claim[];
  datasets: ResearchDataset[];
  charts: ResearchChart[];
  factCheckReport: FactCheckReport;
  approvedHash?: string;
}
