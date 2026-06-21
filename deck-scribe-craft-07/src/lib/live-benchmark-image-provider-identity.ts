import type { LiveBenchmarkOutputBundleManifest } from "./live-benchmark-evidence";

export function liveBenchmarkImageProviderIdentityIds(
  bundle: LiveBenchmarkOutputBundleManifest,
): readonly string[] {
  const turnIds = canonicalProviderIdentityIds(bundle.liveImageTurnIds ?? []);
  return turnIds.length > 0
    ? turnIds
    : canonicalProviderIdentityIds(bundle.liveImageRequestIds ?? []);
}

export function liveBenchmarkCitedImageProviderIdentityIds(
  bundle: LiveBenchmarkOutputBundleManifest,
): readonly string[] {
  return [...(bundle.liveImageTurnIds ?? []), ...(bundle.liveImageRequestIds ?? [])];
}

function canonicalProviderIdentityIds(values: readonly string[]): readonly string[] {
  return values.filter((value) => value.length > 0 && value === value.trim());
}
