import { z } from "zod";
import { parseVersionedProjectImageArtifactPath } from "./image-artifact-path";
import {
  readBrowserImageArtifactWrites,
  type BrowserImageArtifactWrite,
} from "./browser-image-artifact-store";

const BrowserStoredImageMetadataEvidenceSchema = z
  .object({
    path: z.string().min(1),
    providerId: z.enum(["codex", "openaiImage"]),
    slideNumber: z.number().int().positive(),
    request: z
      .object({
        requestId: z.string().optional(),
        turnId: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const BrowserStoredImageProvenanceEvidenceSchema = z
  .object({
    path: z.string().min(1),
    artifactId: z.string().min(1),
    providerKind: z.enum(["codex", "openaiImage"]),
    requestId: z.string().optional(),
    turnId: z.string().optional(),
  })
  .passthrough();

type BrowserStoredImageMetadataEvidence = Readonly<
  z.infer<typeof BrowserStoredImageMetadataEvidenceSchema>
>;
type BrowserStoredImageProvenanceEvidence = Readonly<
  z.infer<typeof BrowserStoredImageProvenanceEvidenceSchema>
>;

export type BrowserStoredImageArtifactEvidence = {
  readonly artifactId: string;
  readonly binaryPath: string;
  readonly metadataPath: string;
  readonly provenancePath: string;
  readonly providerId: BrowserStoredImageMetadataEvidence["providerId"];
  readonly providerRunId: string;
  readonly slideNumber: number;
  readonly version: number;
};

export type BrowserStoredImageArtifactEvidenceResult =
  | { readonly kind: "ready"; readonly evidence: BrowserStoredImageArtifactEvidence }
  | { readonly kind: "blocked"; readonly issues: readonly string[] };

export function readBrowserStoredImageArtifactEvidence(
  binaryPath: string | undefined,
  storage: Storage | undefined = getBrowserStorage(),
): BrowserStoredImageArtifactEvidenceResult {
  if (!binaryPath?.trim()) return blockedEvidence("Slide image artifact path is missing.");
  if (storage === undefined)
    return blockedEvidence("Browser image artifact storage is unavailable.");

  const address = parseVersionedProjectImageArtifactPath(binaryPath);
  if (address === undefined) return blockedEvidence("Slide image artifact path is not versioned.");

  const metadataPath = metadataPathFor(binaryPath);
  const provenancePath = provenancePathFor(binaryPath);
  const writes = readBrowserImageArtifactWrites(storage);
  const metadata = readEvidenceJson(writes, metadataPath, BrowserStoredImageMetadataEvidenceSchema);
  const provenance = readEvidenceJson(
    writes,
    provenancePath,
    BrowserStoredImageProvenanceEvidenceSchema,
  );
  return storedImageArtifactEvidence({
    binaryPath,
    metadataPath,
    provenancePath,
    slideNumber: address.slideNumber,
    version: address.version,
    metadata,
    provenance,
  });
}

function storedImageArtifactEvidence(input: {
  readonly binaryPath: string;
  readonly metadataPath: string;
  readonly provenancePath: string;
  readonly slideNumber: number;
  readonly version: number;
  readonly metadata?: BrowserStoredImageMetadataEvidence;
  readonly provenance?: BrowserStoredImageProvenanceEvidence;
}): BrowserStoredImageArtifactEvidenceResult {
  const issues = evidenceIssues(input);
  if (issues.length > 0) return { kind: "blocked", issues };
  const metadata = input.metadata;
  const provenance = input.provenance;
  if (metadata === undefined || provenance === undefined) {
    return blockedEvidence("Stored image artifact evidence is incomplete.");
  }
  const providerRunId = providerRunIdFor(metadata, provenance);
  if (providerRunId === undefined)
    return blockedEvidence("Stored image provider run id is missing.");
  return {
    kind: "ready",
    evidence: {
      artifactId: provenance.artifactId,
      binaryPath: input.binaryPath,
      metadataPath: input.metadataPath,
      provenancePath: input.provenancePath,
      providerId: metadata.providerId,
      providerRunId,
      slideNumber: input.slideNumber,
      version: input.version,
    },
  };
}

function evidenceIssues(input: {
  readonly metadataPath: string;
  readonly provenancePath: string;
  readonly slideNumber: number;
  readonly metadata?: BrowserStoredImageMetadataEvidence;
  readonly provenance?: BrowserStoredImageProvenanceEvidence;
}): readonly string[] {
  const issues: string[] = [];
  if (input.metadata === undefined) issues.push("Stored image metadata sidecar is missing.");
  if (input.provenance === undefined) issues.push("Stored image provenance sidecar is missing.");
  if (input.metadata?.path !== input.metadataPath) {
    issues.push("Stored image metadata path mismatches.");
  }
  if (input.provenance?.path !== input.provenancePath) {
    issues.push("Stored image provenance path mismatches.");
  }
  if (input.metadata !== undefined && input.metadata.slideNumber !== input.slideNumber) {
    issues.push("Stored image metadata slide number mismatches.");
  }
  if (
    input.metadata !== undefined &&
    input.provenance !== undefined &&
    input.metadata.providerId !== input.provenance.providerKind
  ) {
    issues.push("Stored image provider evidence mismatches.");
  }
  return issues;
}

function readEvidenceJson<T>(
  writes: readonly BrowserImageArtifactWrite[],
  path: string,
  schema: z.ZodType<T>,
): T | undefined {
  const content = writes.find((write) => write.path === path)?.content;
  if (content?.kind !== "text") return undefined;
  try {
    const parsed = schema.safeParse(JSON.parse(content.value));
    return parsed.success ? parsed.data : undefined;
  } catch (error) {
    if (error instanceof Error) return undefined;
    throw error;
  }
}

function providerRunIdFor(
  metadata: BrowserStoredImageMetadataEvidence,
  provenance: BrowserStoredImageProvenanceEvidence,
): string | undefined {
  const candidate =
    metadata.providerId === "codex" ? metadata.request.turnId : metadata.request.requestId;
  const provenanceRunId =
    metadata.providerId === "codex" ? provenance.turnId : provenance.requestId;
  return candidate?.trim() && candidate === provenanceRunId ? candidate : undefined;
}

function metadataPathFor(binaryPath: string): string {
  return binaryPath.replace(/\.png$/, ".metadata.json");
}

function provenancePathFor(binaryPath: string): string {
  return binaryPath.replace(/\.png$/, ".provenance.json");
}

function blockedEvidence(issue: string): BrowserStoredImageArtifactEvidenceResult {
  return { kind: "blocked", issues: [issue] };
}

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}
