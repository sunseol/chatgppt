import type { EvidenceExtractionResult, EvidenceValidationCandidate } from "./evidence-extractor";
import {
  createEvidenceValidationCandidates,
  extractEvidenceFromSource,
} from "./evidence-extractor";
import type { ResearchFetchDependencies, ResearchFetchKind } from "./research-source-fetcher";
import { fetchResearchSource } from "./research-source-fetcher";
import type { SourcePolicyUse } from "./research-source-policy";
import {
  getDefaultSourcePolicy,
  getGradePolicy,
  getUncertaintyPolicy,
} from "./research-source-policy";
import type {
  Claim,
  FactCheckIssue,
  ResearchChart,
  ResearchDataset,
  ResearchPack,
  ResearchSourceType,
  Source,
  SourceGrade,
  SourceUsePolicy,
  UsableSourceGrade,
} from "./research-types";

export interface ResearchSourceSpec {
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly year: number;
  readonly sourceType: ResearchSourceType;
  readonly kind: ResearchFetchKind;
  readonly url?: string;
  readonly filePath?: string;
}

export interface ResearchOrchestratorInput {
  readonly id: string;
  readonly generatedAt: number;
  readonly sources: readonly ResearchSourceSpec[];
}

export interface BuildResearchPackInput {
  readonly id: string;
  readonly generatedAt: number;
  readonly sources: readonly ResearchSourceRecordInput[];
  readonly evidenceResults: readonly EvidenceExtractionResult[];
}

export interface ResearchSourceRecordInput {
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly year: number;
  readonly sourceType: ResearchSourceType;
}

export interface ResearchSourceMapEntry {
  readonly claimId: string;
  readonly sourceIds: readonly string[];
  readonly datasetIds: readonly string[];
  readonly slideCandidates: readonly number[];
}

export interface ResearchOrchestrationResult {
  readonly pack: ResearchPack;
  readonly sourceMap: readonly ResearchSourceMapEntry[];
}

export async function orchestrateResearch(
  input: ResearchOrchestratorInput,
  dependencies: ResearchFetchDependencies,
): Promise<ResearchOrchestrationResult> {
  const sortedSources = [...input.sources].sort(compareSourcePriority);
  const evidenceResults: EvidenceExtractionResult[] = [];
  for (const source of sortedSources) {
    const fetchResult = await fetchResearchSource(
      {
        id: source.id,
        kind: source.kind,
        sourceType: source.sourceType,
        transferTarget: "local",
        url: source.url,
        filePath: source.filePath,
      },
      dependencies,
    );
    if (fetchResult.status === "succeeded" && fetchResult.rawContent) {
      evidenceResults.push(
        extractEvidenceFromSource({ sourceId: source.id, rawContent: fetchResult.rawContent }),
      );
    }
  }
  const pack = buildResearchPackFromEvidence({
    id: input.id,
    generatedAt: input.generatedAt,
    sources: sortedSources,
    evidenceResults,
  });
  return { pack, sourceMap: createResearchSourceMap(pack) };
}

export function buildResearchPackFromEvidence(input: BuildResearchPackInput): ResearchPack {
  const sources = input.sources.filter((source) => source.id).map(toResearchSource);
  const sourceIds = new Set(sources.map((source) => source.id));
  const issues: FactCheckIssue[] = [];
  const uncertainItems: string[] = [];
  const claims: Claim[] = [];
  const datasets: ResearchDataset[] = [];
  const charts: ResearchChart[] = [];
  const candidates = input.evidenceResults.flatMap(createEvidenceValidationCandidates);

  candidates.forEach((candidate) => {
    if (!candidate.sourceIds.some((sourceId) => sourceIds.has(sourceId))) {
      issues.push(fatalIssue("출처 없는 핵심 주장은 슬라이드 기획에 사용할 수 없다."));
      return;
    }
    const claimNumber = claims.length + 1;
    const datasetIds = appendDatasets(candidate, claimNumber, datasets, charts);
    const uncertainty = getUncertaintyPolicy({
      confidence: candidate.confidence ?? "high",
      status: candidate.status ?? "supported",
    });
    const needsUserReview = candidate.needsUserReview || uncertainty.reviewRequired;
    if (needsUserReview) uncertainItems.push(candidate.statement);
    if (candidate.status === "conflicting") {
      issues.push(warningIssue(`상충 자료 검토 필요: ${candidate.statement}`, claimNumber));
    }
    claims.push({
      id: claimId(claimNumber),
      statement: candidate.statement,
      sourceIds: candidate.sourceIds.filter((sourceId) => sourceIds.has(sourceId)),
      datasetIds,
      confidence: candidate.confidence ?? (needsUserReview ? "low" : "high"),
      hasNumber: candidate.numericEvidence.length > 0,
      needsUserReview,
      status: candidate.status ?? (needsUserReview ? "uncertain" : "supported"),
      slideCandidates: [claimNumber],
      numericEvidence: candidate.numericEvidence.map((evidence, index) => ({
        id: `num_${String(index + 1).padStart(3, "0")}`,
        ...evidence,
        datasetId: datasetIds[index],
      })),
    });
  });

  return {
    id: input.id,
    sources,
    claims,
    datasets,
    charts,
    factCheckReport: {
      summary: `Generated ${claims.length} claim candidates from ${sources.length} sources.`,
      generatedAt: input.generatedAt,
      fatalIssueCount: issues.filter((issue) => issue.severity === "fatal").length,
      issues,
      uncertainItems,
    },
  };
}

export function createResearchSourceMap(pack: ResearchPack): ResearchSourceMapEntry[] {
  return pack.claims.map((claim) => ({
    claimId: claim.id,
    sourceIds: claim.sourceIds,
    datasetIds: claim.datasetIds,
    slideCandidates: claim.slideCandidates,
  }));
}

function compareSourcePriority(left: ResearchSourceSpec, right: ResearchSourceSpec): number {
  return policyRank(left.sourceType) - policyRank(right.sourceType);
}

function policyRank(sourceType: ResearchSourceType): number {
  const policy = getGradePolicy(getDefaultSourcePolicy(sourceType).grade);
  if (policy.usePolicy === "priority") return 0;
  if (policy.usePolicy === "allowed") return 1;
  if (policy.usePolicy === "supporting") return 2;
  return 3;
}

function toResearchSource(source: ResearchSourceRecordInput): Source {
  const policy = getDefaultSourcePolicy(source.sourceType);
  return {
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    year: source.year,
    grade: toUsableSourceGrade(policy.grade),
    sourceType: source.sourceType,
    usePolicy: toSourceUsePolicy(policy.usePolicy),
  };
}

function toSourceUsePolicy(policy: SourcePolicyUse): SourceUsePolicy {
  if (policy === "priority" || policy === "allowed" || policy === "supporting") return policy;
  return "restricted";
}

function toUsableSourceGrade(grade: SourceGrade): UsableSourceGrade {
  return grade === "E" ? "D" : grade;
}

function appendDatasets(
  candidate: EvidenceValidationCandidate,
  claimNumber: number,
  datasets: ResearchDataset[],
  charts: ResearchChart[],
): string[] {
  return candidate.numericEvidence.map((evidence, index) => {
    const datasetId = `dataset_${String(datasets.length + 1).padStart(3, "0")}`;
    datasets.push({
      id: datasetId,
      title: `${candidate.statement} data`,
      sourceIds: [evidence.sourceId],
      unit: evidence.unit,
      period: String(evidence.baseYear),
      geography: evidence.geography,
      definition: evidence.definition,
      rows: [
        {
          label: String(evidence.baseYear),
          value: Number(evidence.value),
          year: evidence.baseYear,
        },
      ],
      uncertain: candidate.needsUserReview,
    });
    charts.push({
      id: `chart_${String(charts.length + 1).padStart(3, "0")}`,
      title: candidate.statement,
      chartType: "bar",
      datasetId,
      unit: evidence.unit,
      period: String(evidence.baseYear),
      sourceIds: [evidence.sourceId],
      slideCandidates: [claimNumber],
      uncertain: candidate.needsUserReview,
    });
    return datasetId;
  });
}

function claimId(index: number): string {
  return `claim_${String(index).padStart(3, "0")}`;
}

function fatalIssue(message: string): FactCheckIssue {
  return { id: "issue_fatal_001", severity: "fatal", message };
}

function warningIssue(message: string, claimNumber: number): FactCheckIssue {
  return {
    id: `issue_warning_${String(claimNumber).padStart(3, "0")}`,
    severity: "warning",
    message,
    claimId: claimId(claimNumber),
    uncertain: true,
  };
}
