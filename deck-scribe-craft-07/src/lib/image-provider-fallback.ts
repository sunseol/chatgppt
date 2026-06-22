import type {
  ImageProviderFeasibilityDecision,
  ImageProviderSetup,
  ImageProviderProductCopy,
} from "./image-provider-feasibility";
import type {
  OpenAIImageClient,
  OpenAIImageClientRequest,
  OpenAIImageClientResponse,
} from "./slide-image-provider";

export type OpenAIImageCredentialState = "missing" | "sessionConfigured";

export type OpenAIImageFallbackPublicState = {
  readonly providerId: ImageProviderFeasibilityDecision["providerId"];
  readonly authMode: ImageProviderFeasibilityDecision["authMode"];
  readonly targetModel: ImageProviderFeasibilityDecision["targetModel"];
  readonly setup: ImageProviderSetup;
  readonly fallbackMode: boolean;
  readonly credentialState: OpenAIImageCredentialState;
  readonly connectionCopy: string;
  readonly billingCopy: string;
  readonly permissionCopy: string;
};

export type EphemeralOpenAIImageCredential = {
  readonly authorizationHeader: () => string;
};

export type OpenAIImageFallbackTransportRequest = OpenAIImageClientRequest & {
  readonly authorization: string;
};

export interface OpenAIImageFallbackTransport {
  generate(request: OpenAIImageFallbackTransportRequest): Promise<OpenAIImageClientResponse>;
}

export class OpenAIImageCredentialError extends Error {
  constructor() {
    super("OpenAI image fallback requires a non-empty API key for the current session.");
    this.name = "OpenAIImageCredentialError";
  }
}

export function createEphemeralOpenAIImageCredential(
  apiKey: string,
): EphemeralOpenAIImageCredential {
  const trimmed = apiKey.trim();
  if (trimmed.length === 0) throw new OpenAIImageCredentialError();
  return {
    authorizationHeader: () => `Bearer ${trimmed}`,
  };
}

export function createOpenAIImageFallbackPublicState(input: {
  readonly decision: ImageProviderFeasibilityDecision;
  readonly credential?: EphemeralOpenAIImageCredential;
}): OpenAIImageFallbackPublicState {
  const copy = input.decision.productCopy;
  return {
    providerId: input.decision.providerId,
    authMode: input.decision.authMode,
    targetModel: input.decision.targetModel,
    setup: input.decision.setup,
    fallbackMode: input.decision.providerId === "openaiImage",
    credentialState:
      input.decision.providerId === "openaiImage" && input.credential !== undefined
        ? "sessionConfigured"
        : "missing",
    connectionCopy: copy.connection,
    billingCopy: copy.billing,
    permissionCopy: copy.permission,
  };
}

export function createOpenAIImageFallbackClient(input: {
  readonly credential: EphemeralOpenAIImageCredential;
  readonly transport: OpenAIImageFallbackTransport;
}): OpenAIImageClient {
  return {
    generate(request) {
      return input.transport.generate({
        ...request,
        authorization: input.credential.authorizationHeader(),
      });
    },
  };
}

export function imageFallbackProductCopy(
  state: OpenAIImageFallbackPublicState,
): ImageProviderProductCopy {
  return {
    connection: state.connectionCopy,
    billing: state.billingCopy,
    permission: state.permissionCopy,
  };
}
