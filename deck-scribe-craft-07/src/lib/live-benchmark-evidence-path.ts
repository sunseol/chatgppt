import { hasNonSyntheticEvidencePath } from "./live-evidence-path";

const NON_OBSERVED_BENCHMARK_MARKERS = ["template", "sample", "example", "placeholder"] as const;
const INVALID_BENCHMARK_ARTIFACT_MARKERS = [
  "mock",
  "fixture",
  "test",
  "fake",
  ...NON_OBSERVED_BENCHMARK_MARKERS,
] as const;

export function hasObservedBenchmarkEvidencePath(
  value: string | undefined,
  allowedExtensions: readonly string[],
): boolean {
  if (value === undefined) return false;
  if (value.length === 0 || value !== value.trim()) return false;
  if (!hasNonSyntheticEvidencePath(value, allowedExtensions)) return false;
  return !hasNonObservedBenchmarkMarker(value);
}

export function hasInvalidBenchmarkArtifactMarker(value: string): boolean {
  const normalized = value.toLowerCase();
  return INVALID_BENCHMARK_ARTIFACT_MARKERS.some((marker) => normalized.includes(marker));
}

function hasNonObservedBenchmarkMarker(value: string): boolean {
  const normalized = value.toLowerCase();
  return NON_OBSERVED_BENCHMARK_MARKERS.some((marker) => normalized.includes(marker));
}
