import type {
  SlideRevisionComparison,
  SlideRevisionPreservationCheck,
} from "@/lib/slide-revision-generation";

export function hasUnintendedChangeRisk(comparison: SlideRevisionComparison): boolean {
  return revisionRiskChecks(comparison).length > 0;
}

export function revisionRiskChecks(
  comparison: SlideRevisionComparison,
): readonly SlideRevisionPreservationCheck[] {
  return comparison.preservationChecks.filter((check) => check.status !== "kept");
}
