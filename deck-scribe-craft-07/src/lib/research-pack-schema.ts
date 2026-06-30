import { z } from "zod";
import {
  LiveResearchEvidenceReferenceSchema,
  LiveWebSearchEvidenceSchema,
  ProviderArtifactProvenanceSchema,
} from "./research-pack-live-schema";
import type { Claim, ResearchChart, ResearchDataset, ResearchPack } from "./research-types";

export const ResearchSourceCaptureMetadataSchema = z.object({
  originalUrl: z.string().url(),
  finalUrl: z.string().url(),
  fetchedAt: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
  statusCode: z.number().int().min(100).max(599),
  contentHash: z.string().min(1),
  rawArchivePath: z.string().min(1),
  textArchivePath: z.string().min(1),
  extractedTextHash: z.string().min(1),
  version: z.number().int().positive(),
});

export const SourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  publisher: z.string().min(1),
  year: z.number().int().min(1800),
  grade: z.enum(["A", "B", "C", "D"]),
  sourceType: z.enum([
    "government",
    "international",
    "original_data",
    "research",
    "academic",
    "company",
    "media",
    "industry",
    "user_material",
  ]),
  usePolicy: z.enum(["priority", "allowed", "supporting", "restricted"]),
  url: z.string().url().optional(),
  capture: ResearchSourceCaptureMetadataSchema.optional(),
  captureHistory: z.array(ResearchSourceCaptureMetadataSchema).optional(),
});

export const NumericEvidenceSchema = z.object({
  id: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().min(1),
  baseYear: z.number().int().min(1800),
  geography: z.string().min(1),
  definition: z.string().min(1),
  sourceId: z.string().min(1).optional(),
  datasetId: z.string().min(1).optional(),
  uncertain: z.boolean().optional(),
});

export const ClaimSchema = z
  .object({
    id: z.string().min(1),
    statement: z.string().min(1),
    sourceIds: z.array(z.string().min(1)),
    datasetIds: z.array(z.string().min(1)),
    confidence: z.enum(["high", "medium", "low", "assumption"]),
    hasNumber: z.boolean(),
    needsUserReview: z.boolean(),
    status: z.enum(["supported", "uncertain", "assumption", "conflicting"]),
    slideCandidates: z.array(z.number().int().min(1)),
    numericEvidence: z.array(NumericEvidenceSchema),
  })
  .superRefine((claim, context) => {
    if (claim.hasNumber && claim.numericEvidence.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numericEvidence"],
        message: "Numeric claims require unit, base year, geography, and definition metadata.",
      });
    }
  });

export const ResearchDatasetRowSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
  year: z.number().int().optional(),
  segment: z.string().min(1).optional(),
});

export const ResearchDatasetSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceIds: z.array(z.string().min(1)),
  unit: z.string().min(1),
  period: z.string().min(1),
  geography: z.string().min(1),
  definition: z.string().min(1),
  rows: z.array(ResearchDatasetRowSchema).min(1),
  uncertain: z.boolean(),
});

export const ResearchChartSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  chartType: z.enum(["bar", "line", "table"]),
  datasetId: z.string().min(1),
  unit: z.string().min(1),
  period: z.string().min(1),
  sourceIds: z.array(z.string().min(1)),
  slideCandidates: z.array(z.number().int().min(1)),
  uncertain: z.boolean(),
});

export const FactCheckIssueSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(["fatal", "warning", "info"]),
  message: z.string().min(1),
  claimId: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  datasetId: z.string().min(1).optional(),
  uncertain: z.boolean().optional(),
});

export const FactCheckReportSchema = z.object({
  summary: z.string().min(1),
  generatedAt: z.number().int().nonnegative(),
  fatalIssueCount: z.number().int().nonnegative(),
  issues: z.array(FactCheckIssueSchema),
  uncertainItems: z.array(z.string().min(1)),
});

export const ResearchReviewStateSchema = z.object({
  sourceDecisions: z.array(
    z.object({
      sourceId: z.string().min(1),
      decision: z.literal("excluded"),
      reason: z.string().min(1),
      decidedAt: z.number().int().nonnegative(),
    }),
  ),
  reinforcementRequests: z.array(
    z.object({
      id: z.string().min(1),
      prompt: z.string().min(1),
      status: z.enum(["pending", "resolved"]),
      requestedAt: z.number().int().nonnegative(),
      resolvedAt: z.number().int().nonnegative().optional(),
    }),
  ),
});

export const ResearchPackSchema = z
  .object({
    id: z.string().min(1),
    sources: z.array(SourceSchema).min(1),
    claims: z.array(ClaimSchema),
    datasets: z.array(ResearchDatasetSchema),
    charts: z.array(ResearchChartSchema),
    factCheckReport: FactCheckReportSchema,
    webSearchEvidence: LiveWebSearchEvidenceSchema.optional(),
    liveEvidenceRefs: z.array(LiveResearchEvidenceReferenceSchema).optional(),
    provenanceLineage: z.array(ProviderArtifactProvenanceSchema).optional(),
    review: ResearchReviewStateSchema.optional(),
    approvedHash: z.string().optional(),
  })
  .superRefine((pack, context) => {
    const sourceIds = new Set(pack.sources.map((source) => source.id));
    const datasetIds = new Set(pack.datasets.map((dataset) => dataset.id));
    checkClaimReferences(pack.claims, sourceIds, datasetIds, context);
    checkDatasetReferences(pack.datasets, sourceIds, context);
    checkChartReferences(pack.charts, sourceIds, datasetIds, context);
  });

export function parseResearchPack(input: unknown): ResearchPack {
  return ResearchPackSchema.parse(input);
}

function checkClaimReferences(
  claims: readonly Claim[],
  sourceIds: ReadonlySet<string>,
  datasetIds: ReadonlySet<string>,
  context: z.RefinementCtx,
) {
  claims.forEach((claim, claimIndex) => {
    claim.sourceIds.forEach((sourceId, sourceIndex) => {
      if (!sourceIds.has(sourceId)) {
        addReferenceIssue(context, ["claims", claimIndex, "sourceIds", sourceIndex], sourceId);
      }
    });
    claim.datasetIds.forEach((datasetId, datasetIndex) => {
      if (!datasetIds.has(datasetId)) {
        addReferenceIssue(context, ["claims", claimIndex, "datasetIds", datasetIndex], datasetId);
      }
    });
    claim.numericEvidence.forEach((evidence, evidenceIndex) => {
      if (evidence.sourceId && !sourceIds.has(evidence.sourceId)) {
        addReferenceIssue(
          context,
          ["claims", claimIndex, "numericEvidence", evidenceIndex, "sourceId"],
          evidence.sourceId,
        );
      }
      if (evidence.datasetId && !datasetIds.has(evidence.datasetId)) {
        addReferenceIssue(
          context,
          ["claims", claimIndex, "numericEvidence", evidenceIndex, "datasetId"],
          evidence.datasetId,
        );
      }
    });
  });
}

function checkDatasetReferences(
  datasets: readonly ResearchDataset[],
  sourceIds: ReadonlySet<string>,
  context: z.RefinementCtx,
) {
  datasets.forEach((dataset, datasetIndex) => {
    dataset.sourceIds.forEach((sourceId, sourceIndex) => {
      if (!sourceIds.has(sourceId)) {
        addReferenceIssue(context, ["datasets", datasetIndex, "sourceIds", sourceIndex], sourceId);
      }
    });
  });
}

function checkChartReferences(
  charts: readonly ResearchChart[],
  sourceIds: ReadonlySet<string>,
  datasetIds: ReadonlySet<string>,
  context: z.RefinementCtx,
) {
  charts.forEach((chart, chartIndex) => {
    if (!datasetIds.has(chart.datasetId)) {
      addReferenceIssue(context, ["charts", chartIndex, "datasetId"], chart.datasetId);
    }
    chart.sourceIds.forEach((sourceId, sourceIndex) => {
      if (!sourceIds.has(sourceId)) {
        addReferenceIssue(context, ["charts", chartIndex, "sourceIds", sourceIndex], sourceId);
      }
    });
  });
}

function addReferenceIssue(context: z.RefinementCtx, path: (string | number)[], value: string) {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message: `Unknown research reference: ${value}`,
  });
}
