const SYNTHETIC_EVIDENCE_MARKERS = ["mock", "fixture", "test", "fake"] as const;
const WINDOWS_ABSOLUTE_PATH = /^[a-z]:[\\/]/i;
const URL_LIKE_PATH = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

export function hasNonSyntheticJsonEvidencePath(value: string | undefined): boolean {
  return hasNonSyntheticEvidencePath(value, [".json"]);
}

export function hasNonSyntheticEvidencePath(
  value: string | undefined,
  allowedExtensions: readonly string[],
): boolean {
  if (value === undefined) return false;
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();
  if (!allowedExtensions.some((extension) => normalized.endsWith(extension))) return false;
  if (URL_LIKE_PATH.test(trimmed)) return false;
  if (trimmed.startsWith("/") || normalized.startsWith("file://")) return false;
  if (WINDOWS_ABSOLUTE_PATH.test(trimmed)) return false;
  return !SYNTHETIC_EVIDENCE_MARKERS.some((marker) => normalized.includes(marker));
}
