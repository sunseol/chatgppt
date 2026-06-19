import type { ProviderArtifactProvenanceInput } from "./provider-provenance";
import type { SlideImageArtifact, SlideImageRequestMetadata } from "./slide-image-provider";

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

export type StoredSlideImageArtifact = {
  readonly binary: StoredImageBinary;
  readonly metadata: StoredImageMetadata;
  readonly provenance: ProviderArtifactProvenanceInput;
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
}): Promise<StoredSlideImageArtifact> {
  assertSafeStorageAddress(input);
  const imageBytes = pngBytesFromDataUrl(input.artifact.imageDataUrl);
  const request = requireRequestMetadata(input.artifact);
  const binary = {
    artifactId: imageArtifactId(input.projectId, input.artifact.slideNumber, input.version),
    path: imageArtifactPath(input.projectId, input.artifact.slideNumber, input.version),
    hash: await hashBytes(imageBytes),
    bytes: imageBytes.length,
    createdAt: input.createdAt,
  };
  const metadata = imageMetadata(input, request);

  await input.store.write({ path: binary.path, content: imageBytes });
  await input.store.write({
    path: metadata.path,
    content: JSON.stringify(metadata, null, 2),
  });

  return {
    binary,
    metadata,
    provenance: imageProvenance(input.artifact, binary, request),
  };
}

function assertSafeStorageAddress(input: { readonly projectId: string }): void {
  if (!/^[A-Za-z0-9_-]+$/.test(input.projectId)) {
    throw new ImageArtifactStoreError("Project id must be a safe storage segment.");
  }
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
  artifact: SlideImageArtifact,
  binary: StoredImageBinary,
  request: SlideImageRequestMetadata,
): ProviderArtifactProvenanceInput {
  return {
    artifactId: binary.artifactId,
    executionMode: "production",
    providerKind: artifact.providerId,
    authMode: artifact.providerId === "openaiImage" ? "api_key" : "codex_session",
    modelOrRuntime: request.model,
    promptVersion: `${artifact.prompt.id}@${artifact.prompt.version}`,
    durationMs: request.latencyMs ?? 0,
    inputArtifactIds: [artifact.prompt.hash, artifact.layoutReference.screenshot],
    fixture: false,
    ...(request.requestId === undefined ? {} : { requestId: request.requestId }),
  };
}

function requireRequestMetadata(artifact: SlideImageArtifact): SlideImageRequestMetadata {
  if (!artifact.request) {
    throw new ImageArtifactStoreError("Image artifact request metadata is required.");
  }
  if (!artifact.request.model.trim()) {
    throw new ImageArtifactStoreError("Image artifact request model is required.");
  }
  if (artifact.providerId === "openaiImage" && !artifact.request.requestId) {
    throw new ImageArtifactStoreError("OpenAI image artifacts require a provider request id.");
  }
  if (!validLatencyMs(artifact.request.latencyMs)) {
    throw new ImageArtifactStoreError(
      "Image artifact request latency must be a non-negative number.",
    );
  }
  if (!validUsageSummary(artifact.request.usage)) {
    throw new ImageArtifactStoreError("Image artifact request usage must be non-negative numbers.");
  }
  return artifact.request;
}

function validLatencyMs(value: number | undefined): boolean {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

function validUsageSummary(usage: SlideImageRequestMetadata["usage"]): boolean {
  if (usage === undefined) return true;
  return [usage.inputTokens, usage.outputTokens, usage.imageCount, usage.estimatedCostUsd].every(
    validOptionalAmount,
  );
}

function validOptionalAmount(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
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

export class ImageArtifactStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageArtifactStoreError";
  }
}
