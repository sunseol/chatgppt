import type { LayoutPrototype } from "./deck-types";
import { renderLocalLayoutArtifacts } from "./layout-html-renderer";
import type { LayoutIR } from "./layout-ir";
import { validateLayoutArtifacts } from "./layout-validation";

export function createValidatedLayoutPrototype(ir: LayoutIR): LayoutPrototype {
  const artifacts = renderLocalLayoutArtifacts(ir);
  return {
    ...artifacts.prototype,
    validationReport: validateLayoutArtifacts(artifacts),
  };
}
