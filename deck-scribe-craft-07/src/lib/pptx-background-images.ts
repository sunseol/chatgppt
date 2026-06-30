import type { DeckProject, EditableLayerModel } from "./deck-types";

export type PptxBackgroundImageIssueCode = "invalid_png_data_url" | "invalid_png_signature";

export class PptxBackgroundImageError extends Error {
  readonly code: PptxBackgroundImageIssueCode;

  constructor(code: PptxBackgroundImageIssueCode, message: string) {
    super(message);
    this.name = "PptxBackgroundImageError";
    this.code = code;
  }
}

export type PptxSlideBackgroundImage = {
  readonly slideNumber: number;
  readonly relationshipId: string;
  readonly relationshipTarget: string;
  readonly mediaPath: string;
  readonly bytes: Uint8Array;
};

const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

export function buildPptxSlideBackgroundImages(input: {
  readonly project: DeckProject;
  readonly layers: readonly EditableLayerModel[];
}): readonly PptxSlideBackgroundImage[] {
  const artifacts = new Map(
    (input.project.liveSlideGeneration?.artifacts ?? []).map((artifact) => [
      artifact.slideNumber,
      artifact,
    ]),
  );

  return input.layers.flatMap((model): readonly PptxSlideBackgroundImage[] => {
    const artifact = artifacts.get(model.slideNumber);
    if (artifact === undefined) return [];
    const filename = `slide_${pad3(model.slideNumber)}_background.png`;
    return [
      {
        slideNumber: model.slideNumber,
        relationshipId: "rId2",
        relationshipTarget: `../media/${filename}`,
        mediaPath: `ppt/media/${filename}`,
        bytes: pngBytesFromDataUrl(artifact.imageDataUrl),
      },
    ];
  });
}

export function findPptxBackgroundImage(
  images: readonly PptxSlideBackgroundImage[],
  slideNumber: number,
): PptxSlideBackgroundImage | undefined {
  return images.find((image) => image.slideNumber === slideNumber);
}

function pngBytesFromDataUrl(dataUrl: string): Uint8Array {
  if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
    throw new PptxBackgroundImageError(
      "invalid_png_data_url",
      "PPTX background image must be a PNG data URL.",
    );
  }
  const bytes = bytesFromBase64(dataUrl.slice(PNG_DATA_URL_PREFIX.length));
  if (!PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    throw new PptxBackgroundImageError(
      "invalid_png_signature",
      "PPTX background image must contain valid PNG bytes.",
    );
  }
  return bytes;
}

function bytesFromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function pad3(value: number): string {
  return String(value).padStart(3, "0");
}
