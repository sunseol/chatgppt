import { describe, expect, test } from "bun:test";
import { decideImageProviderFeasibility } from "./image-provider-feasibility";
import {
  OpenAIImageCredentialError,
  createEphemeralOpenAIImageCredential,
  createOpenAIImageFallbackClient,
  createOpenAIImageFallbackPublicState,
  type OpenAIImageFallbackTransportRequest,
} from "./image-provider-fallback";

describe("OpenAI image fallback provider", () => {
  test("keeps API key out of serializable fallback state", () => {
    const credential = createEphemeralOpenAIImageCredential("sk-live-secret123");
    const decision = decideImageProviderFeasibility({
      codexImageCapability: "notSupported",
      apiCredential: "available",
      organizationVerification: "verified",
    });

    const publicState = createOpenAIImageFallbackPublicState({ decision, credential });
    const serialized = JSON.stringify({
      projectId: "project_001",
      imageProvider: publicState,
    });

    expect(publicState.providerId).toBe("openaiImage");
    expect(publicState.fallbackMode).toBe(true);
    expect(publicState.credentialState).toBe("sessionConfigured");
    expect(serialized.includes("sk-live-secret123")).toBe(false);
  });

  test("passes authorization only to the fallback transport", async () => {
    const requests: OpenAIImageFallbackTransportRequest[] = [];
    const credential = createEphemeralOpenAIImageCredential("sk-live-secret456");
    const client = createOpenAIImageFallbackClient({
      credential,
      transport: {
        async generate(request) {
          requests.push(request);
          return { imageDataUrl: "data:image/png;base64,ZmFrZQ==" };
        },
      },
    });

    const response = await client.generate({
      model: "gpt-image-2",
      prompt: "Generate a slide",
      outputKind: "full_presentation_slide",
      designSystemId: "design_001",
      designConsistencyContractId: "full_slide_design_contract_fixture",
      aspectRatio: "16:9",
      layoutReference: {
        screenshot: "layout.png",
        mode: "composition-reference",
      },
    });

    expect(response.imageDataUrl).toBe("data:image/png;base64,ZmFrZQ==");
    expect(requests[0]?.authorization).toBe("Bearer sk-live-secret456");
    expect(JSON.stringify(response).includes("sk-live-secret456")).toBe(false);
  });

  test("shows billing and permission copy for API-key fallback", () => {
    const decision = decideImageProviderFeasibility({
      codexImageCapability: "unknown",
      apiCredential: "missing",
      organizationVerification: "required",
    });

    const publicState = createOpenAIImageFallbackPublicState({ decision });

    expect(publicState.credentialState).toBe("missing");
    expect(publicState.connectionCopy.includes("separate OpenAI API credential")).toBe(true);
    expect(publicState.billingCopy.includes("API organization/project")).toBe(true);
    expect(publicState.permissionCopy.includes("organization verification")).toBe(true);
  });

  test("rejects blank API keys before creating a session credential", () => {
    expect(() => createEphemeralOpenAIImageCredential("   ")).toThrow(OpenAIImageCredentialError);
  });
});
