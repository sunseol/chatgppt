import { z } from "zod";
import {
  PACKAGED_LIVE_EVIDENCE_TICKET_IDS,
  type PackagedLiveEvidenceEntry,
  type PackagedLiveEvidenceIndex,
  type PackagedLiveEvidenceTicketId,
} from "../src/lib/packaged-live-evidence-index";

export const PACKAGED_LIVE_EVIDENCE_INDEX_PATH =
  "docs/live-evidence/release/packaged-live-evidence-index.json";

export const PACKAGED_LIVE_EVIDENCE_ARTIFACT_PATHS = {
  "DF-205": "docs/live-evidence/release/df205-evidence.json",
  "DF-233": "docs/live-evidence/release/df233-evidence.json",
  "DF-235": "docs/live-evidence/release/df235-evidence.json",
  "DF-241": "docs/live-evidence/release/df241-evidence.json",
  "DF-242": "docs/live-evidence/release/df242-evidence.json",
  "DF-243": "docs/live-evidence/release/df243-evidence.json",
  "DF-244": "docs/live-evidence/release/df244-evidence.json",
  "DF-245": "docs/live-evidence/release/df245-evidence.json",
  "DF-246": "docs/live-evidence/release/df246-evidence.json",
  "DF-247": "docs/live-evidence/release/df247-evidence.json",
} as const satisfies Record<PackagedLiveEvidenceTicketId, string>;

const ChildEvidenceArtifactSchema = z
  .object({
    ticketId: z.enum(PACKAGED_LIVE_EVIDENCE_TICKET_IDS),
    issueNumber: z.number().int().positive(),
    status: z.enum(["ready", "blocked"]),
    validationKind: z.enum(["ready", "blocked"]),
    packageArchiveSha256: z.string().min(1),
  })
  .passthrough();

type ChildEvidenceArtifact = z.infer<typeof ChildEvidenceArtifactSchema>;

export type PackagedLiveEvidenceIndexProducerSource = {
  readonly artifactPath: string;
  readonly artifactJson: string;
  readonly artifactSha256: string;
};

export type PackagedLiveEvidenceIndexProducerInput = {
  readonly indexPath: string;
  readonly generatedAt: string;
  readonly sources: readonly PackagedLiveEvidenceIndexProducerSource[];
};

type ParsedPackagedLiveEvidenceSource = {
  readonly artifactPath: string;
  readonly artifactSha256: string;
  readonly artifact: ChildEvidenceArtifact;
};

export class PackagedLiveEvidenceIndexProducerError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid packaged live evidence index input: ${issues.join("; ")}`);
    this.name = "PackagedLiveEvidenceIndexProducerError";
    this.issues = issues;
  }
}

export function producePackagedLiveEvidenceIndex(
  input: PackagedLiveEvidenceIndexProducerInput,
): PackagedLiveEvidenceIndex {
  const parsedSources = input.sources.map(parseSource);
  assertCompleteTicketCoverage(parsedSources);
  const sourceByTicketId = sourcesByTicketId(parsedSources);
  const packageArchiveSha256 = requireSource(sourceByTicketId, "DF-205").artifact
    .packageArchiveSha256;
  return {
    path: input.indexPath,
    packageArchiveSha256,
    generatedAt: input.generatedAt,
    entries: PACKAGED_LIVE_EVIDENCE_TICKET_IDS.map((ticketId) =>
      entryFromSource(requireSource(sourceByTicketId, ticketId)),
    ),
  };
}

function parseSource(
  source: PackagedLiveEvidenceIndexProducerSource,
): ParsedPackagedLiveEvidenceSource {
  const parsedJson = parseJson(source);
  const parsedArtifact = ChildEvidenceArtifactSchema.safeParse(parsedJson);
  if (!parsedArtifact.success) {
    throw new PackagedLiveEvidenceIndexProducerError(
      parsedArtifact.error.issues.map(
        (issue) => `${source.artifactPath}:${issue.path.join(".") || "artifact"}:${issue.message}`,
      ),
    );
  }
  return {
    artifactPath: source.artifactPath,
    artifactSha256: source.artifactSha256,
    artifact: parsedArtifact.data,
  };
}

function parseJson(source: PackagedLiveEvidenceIndexProducerSource): unknown {
  try {
    return JSON.parse(source.artifactJson);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new PackagedLiveEvidenceIndexProducerError([
        `${source.artifactPath}:artifact:${error.message}`,
      ]);
    }
    throw error;
  }
}

function assertCompleteTicketCoverage(sources: readonly ParsedPackagedLiveEvidenceSource[]): void {
  const ticketIds = sources.map((source) => source.artifact.ticketId);
  const missing = PACKAGED_LIVE_EVIDENCE_TICKET_IDS.filter(
    (ticketId) => !ticketIds.includes(ticketId),
  );
  const duplicate = duplicateValues(ticketIds);
  const issues = [
    ...missing.map((ticketId) => `missing child evidence for ${ticketId}`),
    ...duplicate.map((ticketId) => `duplicate child evidence for ${ticketId}`),
  ];
  if (issues.length > 0) throw new PackagedLiveEvidenceIndexProducerError(issues);
}

function sourcesByTicketId(
  sources: readonly ParsedPackagedLiveEvidenceSource[],
): ReadonlyMap<PackagedLiveEvidenceTicketId, ParsedPackagedLiveEvidenceSource> {
  const sourceByTicketId = new Map<
    PackagedLiveEvidenceTicketId,
    ParsedPackagedLiveEvidenceSource
  >();
  for (const source of sources) {
    if (!sourceByTicketId.has(source.artifact.ticketId)) {
      sourceByTicketId.set(source.artifact.ticketId, source);
    }
  }
  return sourceByTicketId;
}

function requireSource(
  sourceByTicketId: ReadonlyMap<PackagedLiveEvidenceTicketId, ParsedPackagedLiveEvidenceSource>,
  ticketId: PackagedLiveEvidenceTicketId,
): ParsedPackagedLiveEvidenceSource {
  const source = sourceByTicketId.get(ticketId);
  if (source) return source;
  throw new PackagedLiveEvidenceIndexProducerError([`missing child evidence for ${ticketId}`]);
}

function entryFromSource(source: ParsedPackagedLiveEvidenceSource): PackagedLiveEvidenceEntry {
  return {
    ticketId: source.artifact.ticketId,
    issueNumber: source.artifact.issueNumber,
    status: source.artifact.status,
    validationKind: source.artifact.validationKind,
    packageArchiveSha256: source.artifact.packageArchiveSha256,
    artifactPath: source.artifactPath,
    artifactSha256: source.artifactSha256,
  };
}

function duplicateValues(values: readonly PackagedLiveEvidenceTicketId[]): readonly string[] {
  const counts = new Map<PackagedLiveEvidenceTicketId, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter((entry) => entry[1] > 1).map((entry) => entry[0]);
}
