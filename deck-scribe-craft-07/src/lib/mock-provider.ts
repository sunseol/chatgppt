import {
  mockBrief,
  mockDesign,
  mockLayers,
  mockLayout,
  mockPlan,
  mockResearch,
  mockSlides,
} from "./mock-ai";
import type { DeckProvider } from "./provider-types";
import { ProviderCapabilities } from "./provider-types";

export function createMockDeckProvider(): DeckProvider {
  return {
    id: "mock",
    name: "Deterministic Mock Provider",
    kind: "mock",
    capabilities: ProviderCapabilities,
    async getStatus() {
      return {
        kind: "connected",
        providerId: "mock",
        message: "Mock provider is ready.",
      };
    },
    async createInterviewBrief(input) {
      return mockBrief(input.prompt, input.slideCount, input.aspectRatio);
    },
    async createResearchPack(input) {
      return mockResearch(input.brief);
    },
    async createDeckPlan(input) {
      return mockPlan(input.brief, input.research);
    },
    async createDesignSystem(input) {
      return mockDesign(input.brief, input.plan);
    },
    async createLayoutPrototype(input) {
      return mockLayout(input.plan, input.design);
    },
    async createGeneratedSlides(input) {
      return mockSlides(input.plan);
    },
    async createEditableLayers(input) {
      return mockLayers(input.plan, input.design);
    },
  };
}
