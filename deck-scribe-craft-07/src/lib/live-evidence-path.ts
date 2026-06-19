const SYNTHETIC_EVIDENCE_MARKERS = ["mock", "fixture", "test", "fake"] as const;
const WINDOWS_ABSOLUTE_PATH = /^[a-z]:[\\/]/i;

export function hasNonSyntheticJsonEvidencePath(value: string | undefined): boolean {
  if (value === undefined) return false;
  const trimmed = value.trim();
  if (!trimmed.endsWith(".json")) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("file://")) return false;
  if (WINDOWS_ABSOLUTE_PATH.test(trimmed)) return false;
  const normalized = trimmed.toLowerCase();
  return !SYNTHETIC_EVIDENCE_MARKERS.some((marker) => normalized.includes(marker));
}
