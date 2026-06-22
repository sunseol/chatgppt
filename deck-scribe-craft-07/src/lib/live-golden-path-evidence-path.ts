import { hasNonSyntheticEvidencePath } from "./live-evidence-path";

const NON_OBSERVED_GOLDEN_PATH_MARKERS = ["template", "sample", "example", "placeholder"] as const;

export function hasObservedGoldenPathEvidencePath(
  value: string | undefined,
  allowedExtensions: readonly string[],
): boolean {
  if (value === undefined) return false;
  if (value.length === 0 || value !== value.trim()) return false;
  if (!hasNonSyntheticEvidencePath(value, allowedExtensions)) return false;
  const normalized = value.toLowerCase();
  return !NON_OBSERVED_GOLDEN_PATH_MARKERS.some((marker) => normalized.includes(marker));
}
