import type {
  DeckPlan,
  DesignSystem,
  EditableLayerModel,
  GeneratedSlide,
  InterviewBrief,
  LayoutPrototype,
  ResearchPack,
} from "./deck-types";

export const ProviderCapabilities = [
  "interview",
  "research",
  "deckPlan",
  "designSystem",
  "layoutPrototype",
  "imageGeneration",
  "editableLayers",
] as const;

export type ProviderCapability = (typeof ProviderCapabilities)[number];
export type ProviderKind = "mock" | "codex" | "openaiImage" | "local";

export type ProviderStatus =
  | {
      readonly kind: "connected";
      readonly providerId: string;
      readonly message: string;
    }
  | {
      readonly kind: "requiresAuth";
      readonly providerId: string;
      readonly message: string;
    }
  | {
      readonly kind: "unavailable";
      readonly providerId: string;
      readonly message: string;
    };

export interface InterviewInput {
  readonly prompt: string;
  readonly slideCount: number;
  readonly aspectRatio: "16:9" | "4:3";
}

export interface ResearchInput {
  readonly brief: InterviewBrief;
}

export interface DeckPlanInput {
  readonly brief: InterviewBrief;
  readonly research: ResearchPack;
}

export interface DesignInput {
  readonly brief: InterviewBrief;
  readonly plan: DeckPlan;
}

export interface LayoutInput {
  readonly plan: DeckPlan;
  readonly design: DesignSystem;
}

export interface SlideGenerationInput {
  readonly plan: DeckPlan;
}

export interface EditableLayerInput {
  readonly plan: DeckPlan;
  readonly design: DesignSystem;
}

export interface DeckProvider {
  readonly id: string;
  readonly name: string;
  readonly kind: ProviderKind;
  readonly capabilities: readonly ProviderCapability[];
  getStatus(): Promise<ProviderStatus>;
  createInterviewBrief(input: InterviewInput): Promise<InterviewBrief>;
  createResearchPack(input: ResearchInput): Promise<ResearchPack>;
  createDeckPlan(input: DeckPlanInput): Promise<DeckPlan>;
  createDesignSystem(input: DesignInput): Promise<DesignSystem>;
  createLayoutPrototype(input: LayoutInput): Promise<LayoutPrototype>;
  createGeneratedSlides(input: SlideGenerationInput): Promise<GeneratedSlide[]>;
  createEditableLayers(input: EditableLayerInput): Promise<EditableLayerModel[]>;
}
