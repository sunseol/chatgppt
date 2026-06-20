import { hasNonSyntheticJsonEvidencePath } from "./live-evidence-path";

const NON_OBSERVED_EVIDENCE_MARKERS = ["template", "sample", "example", "placeholder"] as const;

export function hasObservedInterruptionEvidencePath(path: string | undefined): boolean {
  if (path === undefined) return false;
  if (!hasNonSyntheticJsonEvidencePath(path)) return false;
  const normalizedPath = path.toLowerCase();
  return !NON_OBSERVED_EVIDENCE_MARKERS.some((marker) => normalizedPath.includes(marker));
}
