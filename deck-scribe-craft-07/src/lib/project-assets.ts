import type { ArtifactRecord } from "./artifacts";
import { hashContent } from "./artifacts";

export type ProjectAssetKind = "image" | "pdf" | "table" | "text";
export type ProjectAssetReferenceTarget = "research" | "plan" | "design";
export type ProjectAssetTransferTarget = "local" | "external_provider";

export type ProjectAssetImportInput = {
  readonly projectId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly content: string;
  readonly sensitive: boolean;
};

export type ProjectAssetImportOptions = {
  readonly version: number;
  readonly importedAt: number;
};

export type ProjectAsset = {
  readonly artifact: ArtifactRecord;
  readonly originalFileName: string;
  readonly mimeType: string;
  readonly kind: ProjectAssetKind;
  readonly sizeBytes: number;
  readonly sensitive: boolean;
  readonly referenceTargets: readonly ProjectAssetReferenceTarget[];
};

export type ProjectAssetExternalTransferReview = {
  readonly target: ProjectAssetTransferTarget;
  readonly requiresUserConfirmation: boolean;
  readonly reason: string;
};

const REFERENCE_TARGETS: readonly ProjectAssetReferenceTarget[] = ["research", "plan", "design"];

export class ProjectAssetImportError extends Error {
  constructor(fileName: string, mimeType: string) {
    super(`Unsupported project asset type for "${fileName}" (${mimeType}).`);
    this.name = "ProjectAssetImportError";
  }
}

export function importProjectAsset(
  input: ProjectAssetImportInput,
  options: ProjectAssetImportOptions,
): ProjectAsset {
  const fileName = normalizeFileName(input.fileName);
  const kind = detectAssetKind(fileName, input.mimeType);
  const slug = assetSlug(fileName);
  return {
    artifact: {
      id: `${input.projectId}_asset_${slug.replaceAll(".", "_")}_v${options.version}`,
      projectId: input.projectId,
      type: "asset",
      version: options.version,
      hash: hashContent(input.content),
      path: `projects/${input.projectId}/assets/${slug}.v${options.version}`,
      createdAt: options.importedAt,
    },
    originalFileName: fileName,
    mimeType: input.mimeType,
    kind,
    sizeBytes: new TextEncoder().encode(input.content).length,
    sensitive: input.sensitive,
    referenceTargets: REFERENCE_TARGETS,
  };
}

export function createAssetExternalTransferReview(
  asset: ProjectAsset,
  target: ProjectAssetTransferTarget,
): ProjectAssetExternalTransferReview {
  if (target === "local") {
    return {
      target,
      requiresUserConfirmation: false,
      reason: "Local use does not transfer the user asset to an external provider.",
    };
  }
  return {
    target,
    requiresUserConfirmation: asset.sensitive,
    reason: asset.sensitive
      ? `Sensitive user asset ${asset.artifact.id} requires review before external provider transfer.`
      : `User asset ${asset.artifact.id} can be sent to an external provider after normal confirmation.`,
  };
}

function normalizeFileName(fileName: string): string {
  const lastSegment = fileName.trim().split(/[/\\]/).filter(Boolean).at(-1);
  return lastSegment && lastSegment.length > 0 ? lastSegment : "asset";
}

function assetSlug(fileName: string): string {
  const lower = fileName.toLowerCase();
  const slug = lower.replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length === 0 ? "asset" : slug;
}

function detectAssetKind(fileName: string, mimeType: string): ProjectAssetKind {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();
  if (lowerMime.startsWith("image/")) return "image";
  if (lowerMime === "application/pdf" || lowerName.endsWith(".pdf")) return "pdf";
  if (isTableAsset(lowerName, lowerMime)) return "table";
  if (lowerMime.startsWith("text/") || lowerName.endsWith(".md")) return "text";
  throw new ProjectAssetImportError(fileName, mimeType);
}

function isTableAsset(fileName: string, mimeType: string): boolean {
  return (
    mimeType === "text/csv" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".xlsx")
  );
}
