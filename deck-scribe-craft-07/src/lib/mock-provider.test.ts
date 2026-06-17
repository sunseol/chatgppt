import { describe, expect, test } from "bun:test";
import { createMockDeckProvider } from "./mock-provider";
import { ProviderCapabilities } from "./provider-types";

describe("mock deck provider", () => {
  test("reports connected status and vertical-slice capabilities", async () => {
    const provider = createMockDeckProvider();

    const status = await provider.getStatus();

    expect(status).toEqual({
      kind: "connected",
      providerId: "mock",
      message: "Mock provider is ready.",
    });
    expect(provider.capabilities).toEqual(ProviderCapabilities);
  });

  test("generates the VS0 output chain through the adapter contract", async () => {
    const provider = createMockDeckProvider();

    const brief = await provider.createInterviewBrief({
      prompt: "Create a verified VC pitch deck.",
      slideCount: 6,
      aspectRatio: "16:9",
    });
    const research = await provider.createResearchPack({ brief });
    const plan = await provider.createDeckPlan({ brief, research });
    const design = await provider.createDesignSystem({
      brief,
      plan: { ...plan, approvedHash: "sha256:plan" },
    });
    const layout = await provider.createLayoutPrototype({ plan, design });
    const slides = await provider.createGeneratedSlides({ plan });
    const layers = await provider.createEditableLayers({ plan, design });

    expect(plan.slides.length).toBe(6);
    expect(layout.slides.length).toBe(6);
    expect(slides.length).toBe(6);
    expect(layers.length).toBe(6);
  });
});
