import type { ProviderArtifactProvenanceInput } from "./provider-provenance";
import { ImageArtifactStoreError } from "./image-artifact-store-error";
import { assertLiveImageProviderArtifact } from "./image-artifact-store-live-provider";
import { requireImageRequestMetadata } from "./image-artifact-store-request-metadata";
import type { SlideImageArtifact, SlideImageRequestMetadata } from "./slide-image-provider";

export { ImageArtifactStoreError } from "./image-artifact-store-error";

export type ImageArtifactStoreWrite = {
  readonly path: string;
  readonly content: string | Uint8Array;
};

export interface ImageArtifactStore {
  write(entry: ImageArtifactStoreWrite): Promise<void>;
}

export type StoredImageBinary = {
  readonly artifactId: string;
  readonly path: string;
  readonly hash: string;
  readonly bytes: number;
  readonly createdAt: number;
};

export type StoredImageMetadata = {
  readonly path: string;
  readonly providerId: SlideImageArtifact["providerId"];
  readonly slideNumber: number;
  readonly aspectRatio: SlideImageArtifact["aspectRatio"];
  readonly canvas: SlideImageArtifact["canvas"];
  readonly layoutReference: SlideImageArtifact["layoutReference"];
  readonly prompt: SlideImageArtifact["prompt"];
  readonly request: SlideImageRequestMetadata;
  readonly generatedAt: number;
};

export type StoredImageProvenance = ProviderArtifactProvenanceInput & {
  readonly path: string;
};

export type StoredSlideImageArtifact = {
  readonly binary: StoredImageBinary;
  readonly metadata: StoredImageMetadata;
  readonly provenance: StoredImageProvenance;
};

export function createImageArtifactStore(store: ImageArtifactStore): ImageArtifactStore {
  return store;
}

export async function storeSlideImageArtifact(input: {
  readonly store: ImageArtifactStore;
  readonly projectId: string;
  readonly artifact: SlideImageArtifact;
  readonly version: number;
  readonly createdAt: number;
  readonly extraInputArtifactIds?: readonly string[];
}): Promise<StoredSlideImageArtifact> {
  assertLiveImageProviderArtifact(input.artifact);
  assertSafeStorageAddress(input);
  assertImageInputLineage(input.artifact, input.extraInputArtifactIds ?? []);
  const imageBytes = pngBytesFromDataUrl(input.artifact.imageDataUrl);
  const request = requireImageRequestMetadata(input.artifact);
  const binary = {
    artifactId: imageArtifactId(input.projectId, input.artifact.slideNumber, input.version),
    path: imageArtifactPath(input.projectId, input.artifact.slideNumber, input.version),
    hash: await hashBytes(imageBytes),
    bytes: imageBytes.length,
    createdAt: input.createdAt,
  };
  const metadata = imageMetadata(input, request);
  const provenance = imageProvenance(input, binary, request);

  await input.store.write({ path: binary.path, content: imageBytes });
  await input.store.write({
    path: metadata.path,
    content: JSON.stringify(metadata, null, 2),
  });
  await input.store.write({
    path: provenance.path,
    content: JSON.stringify(provenance, null, 2),
  });

  return {
    binary,
    metadata,
    provenance,
  };
}

function assertSafeStorageAddress(input: {
  readonly projectId: string;
  readonly artifact: SlideImageArtifact;
  readonly version: number;
}): void {
  if (!/^[A-Za-z0-9_-]+$/.test(input.projectId)) {
    throw new ImageArtifactStoreError("Project id must be a safe storage segment.");
  }
  if (!positiveInteger(input.artifact.slideNumber)) {
    throw new ImageArtifactStoreError("Slide number must be a positive integer.");
  }
  if (!positiveInteger(input.version)) {
    throw new ImageArtifactStoreError("Artifact version must be a positive integer.");
  }
}

function assertImageInputLineage(
  artifact: SlideImageArtifact,
  extraInputArtifactIds: readonly string[],
): void {
  if (
    !canonicalNonEmpty(artifact.prompt.id) ||
    !canonicalNonEmpty(artifact.prompt.version) ||
    !canonicalNonEmpty(artifact.prompt.hash)
  ) {
    throw new ImageArtifactStoreError("Image artifact prompt lineage is required.");
  }
  if (!canonicalNonEmpty(artifact.layoutReference.screenshot)) {
    throw new ImageArtifactStoreError("Image artifact layout reference is required.");
  }
  if (!extraInputArtifactIds.every(canonicalNonEmpty)) {
    throw new ImageArtifactStoreError("Image artifact extra input lineage is required.");
  }
}

function canonicalNonEmpty(value: string): boolean {
  return value.length > 0 && value === value.trim();
}

function imageMetadata(
  input: {
    readonly projectId: string;
    readonly artifact: SlideImageArtifact;
    readonly version: number;
  },
  request: SlideImageRequestMetadata,
): StoredImageMetadata {
  return {
    path: imageMetadataPath(input.projectId, input.artifact.slideNumber, input.version),
    providerId: input.artifact.providerId,
    slideNumber: input.artifact.slideNumber,
    aspectRatio: input.artifact.aspectRatio,
    canvas: input.artifact.canvas,
    layoutReference: input.artifact.layoutReference,
    prompt: input.artifact.prompt,
    request,
    generatedAt: input.artifact.generatedAt,
  };
}

function imageProvenance(
  input: {
    readonly projectId: string;
    readonly artifact: SlideImageArtifact;
    readonly version: number;
    readonly extraInputArtifactIds?: readonly string[];
  },
  binary: StoredImageBinary,
  request: SlideImageRequestMetadata,
): StoredImageProvenance {
  return {
    path: imageProvenancePath(input.projectId, input.artifact.slideNumber, input.version),
    artifactId: binary.artifactId,
    executionMode: "production",
    providerKind: input.artifact.providerId,
    authMode: input.artifact.providerId === "openaiImage" ? "api_key" : "codex_session",
    modelOrRuntime: request.model,
    promptVersion: `${input.artifact.prompt.id}@${input.artifact.prompt.version}`,
    durationMs: request.latencyMs ?? 0,
    inputArtifactIds: imageInputArtifactIds(input),
    fixture: false,
    ...(request.requestId === undefined ? {} : { requestId: request.requestId }),
    ...(request.threadId === undefined ? {} : { threadId: request.threadId }),
    ...(request.turnId === undefined ? {} : { turnId: request.turnId }),
  };
}

function imageInputArtifactIds(input: {
  readonly artifact: SlideImageArtifact;
  readonly extraInputArtifactIds?: readonly string[];
}): readonly string[] {
  return [
    ...new Set([
      input.artifact.prompt.hash,
      input.artifact.layoutReference.screenshot,
      ...(input.extraInputArtifactIds ?? []),
    ]),
  ];
}

function positiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function pngBytesFromDataUrl(dataUrl: string): Uint8Array {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix)) {
    throw new ImageArtifactStoreError("Expected PNG data URL for image artifact bytes.");
  }
  const bytes = base64ToBytes(dataUrl.slice(prefix.length));
  if (!hasPngSignature(bytes)) {
    throw new ImageArtifactStoreError("Expected valid PNG signature for image artifact bytes.");
  }
  return bytes;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function imageArtifactId(projectId: string, slideNumber: number, version: number): string {
  return `${projectId}_image_slide_${pad3(slideNumber)}_v${version}`;
}

function imageArtifactPath(projectId: string, slideNumber: number, version: number): string {
  return `projects/${projectId}/slides/images/slide_${pad3(slideNumber)}.v${version}.png`;
}

function imageMetadataPath(projectId: string, slideNumber: number, version: number): string {
  return `projects/${projectId}/slides/images/slide_${pad3(slideNumber)}.v${version}.metadata.json`;
}

function imageProvenancePath(projectId: string, slideNumber: number, version: number): string {
  return `projects/${projectId}/slides/images/slide_${pad3(slideNumber)}.v${version}.provenance.json`;
}

function pad3(value: number): string {
  return String(value).padStart(3, "0");
}

function hasPngSignature(bytes: Uint8Array): boolean {
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  return pngSignature.every((byte, index) => bytes[index] === byte);
}

async function hashBytes(bytes: Uint8Array): Promise<string> {
  const digestInput = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(digestInput).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}
