import type { DeckPlan, DeckProject, DesignSystem, LayoutPrototype } from "./deck-types";

export type LiveTextPipelineReadyPatch = Readonly<
  Pick<DeckProject, "stage"> & {
    readonly plan: DeckPlan;
    readonly design: DesignSystem;
    readonly layout: LayoutPrototype;
  }
>;
