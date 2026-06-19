import {
  parseVersionedProjectImageArtifactPath,
  parseVersionedProjectImageProvenancePath,
  type VersionedProjectImageArtifactAddress,
} from "./image-artifact-path";
import type { ImagePathBlocker } from "./image-path-decision";

export function storedArtifactPathBlockers(
  binaryArtifactPath: string | undefined,
  provenanceArtifactPath: string | undefined,
  artifactSlideNumber: number,
): readonly ImagePathBlocker[] {
  const binaryAddress =
    binaryArtifactPath === undefined
      ? undefined
      : parseVersionedProjectImageArtifactPath(binaryArtifactPath);
  const provenanceAddress =
    provenanceArtifactPath === undefined
      ? undefined
      : parseVersionedProjectImageProvenancePath(provenanceArtifactPath);
  return [
    ...binaryArtifactPathBlockers(binaryArtifactPath, binaryAddress, artifactSlideNumber),
    ...provenanceArtifactPathBlockers(
      provenanceArtifactPath,
      provenanceAddress,
      artifactSlideNumber,
      binaryAddress,
    ),
  ];
}

function binaryArtifactPathBlockers(
  binaryArtifactPath: string | undefined,
  binaryAddress: VersionedProjectImageArtifactAddress | undefined,
  artifactSlideNumber: number,
): readonly ImagePathBlocker[] {
  if (!binaryArtifactPath?.trim()) {
    return [
      {
        code: "missing_binary_artifact",
        message: "The successful image artifact must be written to artifact storage.",
      },
    ];
  }
  if (binaryAddress === undefined) {
    return [
      {
        code: "invalid_binary_artifact_path",
        message:
          "The successful image artifact path must point to versioned project image storage.",
      },
    ];
  }
  if (binaryAddress.slideNumber === artifactSlideNumber) return [];
  return [
    {
      code: "binary_artifact_slide_mismatch",
      message: "The stored binary artifact path must match the successful image slide number.",
    },
  ];
}

function provenanceArtifactPathBlockers(
  provenanceArtifactPath: string | undefined,
  provenanceAddress: VersionedProjectImageArtifactAddress | undefined,
  artifactSlideNumber: number,
  binaryAddress: VersionedProjectImageArtifactAddress | undefined,
): readonly ImagePathBlocker[] {
  if (!provenanceArtifactPath?.trim()) {
    return [
      {
        code: "missing_provenance_artifact",
        message: "The successful image artifact must retain provider provenance storage.",
      },
    ];
  }
  if (provenanceAddress === undefined) {
    return [
      {
        code: "invalid_provenance_artifact_path",
        message: "Provider provenance must point to versioned project image storage.",
      },
    ];
  }
  if (provenanceMatchesArtifact(provenanceAddress, artifactSlideNumber, binaryAddress)) return [];
  return [
    {
      code: "provenance_artifact_path_mismatch",
      message:
        "Provider provenance storage must match the successful image slide and binary version.",
    },
  ];
}

function provenanceMatchesArtifact(
  provenanceAddress: VersionedProjectImageArtifactAddress,
  artifactSlideNumber: number,
  binaryAddress: VersionedProjectImageArtifactAddress | undefined,
): boolean {
  if (provenanceAddress.slideNumber !== artifactSlideNumber) return false;
  if (binaryAddress === undefined) return true;
  return (
    provenanceAddress.slideNumber === binaryAddress.slideNumber &&
    provenanceAddress.version === binaryAddress.version
  );
}
