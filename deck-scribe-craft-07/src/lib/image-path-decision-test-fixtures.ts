import { encodeSolidPngDataUrl } from "./png-encoder";
import type { ProviderArtifactProvenance } from "./provider-provenance";
import type { SlideImageArtifact } from "./slide-image-provider";

export const IMAGE_DECISION_BINARY_ARTIFACT_PATH =
  "projects/project_001/slides/images/slide_001.v1.png";
export const IMAGE_DECISION_PROVENANCE_ARTIFACT_PATH =
  "projects/project_001/slides/images/slide_001.v1.provenance.json";

export function imageDecisionProviderProvenance(
  input: {
    readonly slideNumber?: number;
    readonly version?: number;
  } = {},
): ProviderArtifactProvenance {
  const slideNumber = input.slideNumber ?? 1;
  const slideId = paddedSlideNumber(slideNumber);
  const version = input.version ?? 1;
  return {
    artifactId: `project_001_image_slide_${slideId}_v${version}`,
    executionMode: "production",
    providerKind: "openaiImage",
    authMode: "api_key",
    modelOrRuntime: "gpt-image-2",
    promptVersion: "slide_generation@v1",
    durationMs: 2_400,
    inputArtifactIds: ["sha256:prompt", `slide_${slideId}_layout.png`],
    fixture: false,
    requestId: "img_req_001",
  };
}

export function imageDecisionRealImageArtifact(
  input: {
    readonly slideNumber?: number;
  } = {},
): SlideImageArtifact {
  const slideNumber = input.slideNumber ?? 1;
  const slideId = paddedSlideNumber(slideNumber);
  return {
    providerId: "openaiImage",
    slideNumber,
    aspectRatio: "16:9",
    canvas: { width: 1600, height: 900 },
    layoutReference: {
      screenshot: `slide_${slideId}_layout.png`,
      mode: "composition-reference",
    },
    imageDataUrl: encodeSolidPngDataUrl({
      width: 1,
      height: 1,
      color: { r: 20, g: 40, b: 60, a: 255 },
    }),
    prompt: {
      id: "slide_generation",
      version: "v1",
      hash: "sha256:prompt",
    },
    request: {
      model: "gpt-image-2",
      requestId: "img_req_001",
      size: "1600x900",
      quality: "high",
      latencyMs: 2_400,
    },
    generatedAt: 1_789_700_000,
  };
}

function paddedSlideNumber(slideNumber: number): string {
  return String(slideNumber).padStart(3, "0");
}
