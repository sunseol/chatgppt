import type { ExecutionMode } from "./provider-provenance";
import type { ProviderKind } from "./provider-types";

export type ProviderSelectionOption = {
  readonly providerId: string;
  readonly providerKind: ProviderKind;
  readonly label: string;
};

export function selectProviderOptionsForRuntime(input: {
  readonly executionMode: ExecutionMode;
  readonly providers: readonly ProviderSelectionOption[];
}): readonly ProviderSelectionOption[] {
  if (input.executionMode !== "production") return input.providers;
  return input.providers.filter((provider) => provider.providerKind !== "mock");
}
