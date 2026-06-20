import { redactSensitiveText } from "./redaction";

export type ImageProviderFailureKind =
  | "auth"
  | "quota"
  | "rate_limit"
  | "content_policy"
  | "provider_contract"
  | "server"
  | "unknown";

export type ImageProviderFailureClassification = {
  readonly kind: ImageProviderFailureKind;
  readonly retryable: boolean;
  readonly message: string;
};

export class ImageProviderRequestError extends Error {
  readonly kind: ImageProviderFailureKind;

  constructor(kind: ImageProviderFailureKind, message: string) {
    super(message);
    this.name = "ImageProviderRequestError";
    this.kind = kind;
  }
}

export function classifyImageProviderFailure(error: unknown): ImageProviderFailureClassification {
  if (error instanceof ImageProviderRequestError) {
    return {
      kind: error.kind,
      retryable: isTransient(error.kind),
      message: redactSensitiveText(error.message),
    };
  }
  return {
    kind: "unknown",
    retryable: true,
    message: redactSensitiveText(
      error instanceof Error ? error.message : "Unknown image provider failure.",
    ),
  };
}

function isTransient(kind: ImageProviderFailureKind): boolean {
  return kind === "rate_limit" || kind === "server" || kind === "unknown";
}
