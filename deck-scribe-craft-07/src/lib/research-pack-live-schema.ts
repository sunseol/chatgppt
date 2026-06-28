import { z } from "zod";

const QuoteSpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  text: z.string().min(1),
});

const TableReferenceSchema = z.object({
  tableId: z.string().min(1),
  rowKey: z.string().min(1),
  columnKey: z.string().min(1),
});

export const LiveResearchEvidenceReferenceSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().min(1),
    claimId: z.string().min(1),
    sourceId: z.string().min(1),
    sourceArtifactPath: z.string().min(1),
    kind: z.literal("quote_span"),
    quoteSpan: QuoteSpanSchema,
    datasetId: z.string().min(1).optional(),
  }),
  z.object({
    id: z.string().min(1),
    claimId: z.string().min(1),
    sourceId: z.string().min(1),
    sourceArtifactPath: z.string().min(1),
    kind: z.literal("table_reference"),
    tableRef: TableReferenceSchema,
    datasetId: z.string().min(1).optional(),
  }),
]);

export const ProviderArtifactProvenanceSchema = z.object({
  artifactId: z.string().min(1),
  executionMode: z.enum(["test", "development", "production"]),
  providerKind: z.enum(["mock", "codex", "openaiImage", "local"]),
  authMode: z.enum(["none", "codex_session", "api_key", "local"]),
  modelOrRuntime: z.string().min(1),
  promptVersion: z.string().min(1),
  durationMs: z.number().nonnegative(),
  inputArtifactIds: z.array(z.string().min(1)),
  fixture: z.boolean(),
  requestId: z.string().min(1).optional(),
  turnId: z.string().min(1).optional(),
  threadId: z.string().min(1).optional(),
});

export const LiveWebSearchEvidenceSchema = z.object({
  researchTurnId: z.string().min(1),
  webSearchMode: z.enum(["live", "cached", "mock"]),
  queries: z.array(z.string().min(1)),
  candidates: z.array(
    z.object({
      id: z.string().min(1),
      url: z.string().url(),
      title: z.string().min(1),
      discoveredAt: z.number().int().nonnegative(),
      query: z.string().min(1),
      sourceCandidateType: z.enum(["official", "primary", "secondary", "dataset"]),
      mode: z.enum(["live", "cached", "mock"]),
    }),
  ),
  latestnessBenchmark: z.object({
    query: z.string().min(1),
    mode: z.enum(["live", "cached", "mock"]),
    completedAt: z.number().int().nonnegative(),
    candidateIds: z.array(z.string().min(1)),
  }),
});
