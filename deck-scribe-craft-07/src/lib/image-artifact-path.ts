export type VersionedProjectImageArtifactAddress = {
  readonly slideNumber: number;
  readonly version: number;
};

const IMAGE_ARTIFACT_PATH =
  /^projects\/[A-Za-z0-9_-]+\/slides\/images\/slide_(\d{3})\.v(\d+)\.png$/;
const IMAGE_PROVENANCE_PATH =
  /^projects\/[A-Za-z0-9_-]+\/slides\/images\/slide_(\d{3})\.v(\d+)\.provenance\.json$/;

export function parseVersionedProjectImageArtifactPath(
  path: string,
): VersionedProjectImageArtifactAddress | undefined {
  return parseVersionedProjectImagePath(path, IMAGE_ARTIFACT_PATH);
}

export function parseVersionedProjectImageProvenancePath(
  path: string,
): VersionedProjectImageArtifactAddress | undefined {
  return parseVersionedProjectImagePath(path, IMAGE_PROVENANCE_PATH);
}

export function isVersionedProjectImageArtifactPath(path: string): boolean {
  return parseVersionedProjectImageArtifactPath(path) !== undefined;
}

export function isVersionedProjectImageProvenancePath(path: string): boolean {
  return parseVersionedProjectImageProvenancePath(path) !== undefined;
}

function parseVersionedProjectImagePath(
  path: string,
  pattern: RegExp,
): VersionedProjectImageArtifactAddress | undefined {
  const match = pattern.exec(path);
  if (!match) return undefined;
  const slideNumber = match[1];
  const version = match[2];
  if (slideNumber === undefined || version === undefined) return undefined;
  return {
    slideNumber: Number.parseInt(slideNumber, 10),
    version: Number.parseInt(version, 10),
  };
}
