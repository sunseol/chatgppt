import type { FrozenDeckContext } from "./deck-context";

export function approvedArtifactIdsForContext(context: FrozenDeckContext): readonly string[] {
  return [
    context.approvedArtifacts.briefId,
    context.approvedArtifacts.researchPackId,
    context.approvedArtifacts.deckPlanId,
    context.approvedArtifacts.designSystemId,
    context.approvedArtifacts.layoutPrototypeId,
  ];
}

export function approvedArtifactBundleIssues(input: {
  readonly artifactIds: readonly string[];
  readonly ownerLabel: string;
}): readonly string[] {
  const seenArtifactIds = new Set<string>();
  const duplicateArtifactIds = new Set<string>();
  for (const artifactId of input.artifactIds) {
    const normalizedArtifactId = artifactId.trim();
    if (!normalizedArtifactId) continue;
    if (seenArtifactIds.has(normalizedArtifactId)) {
      duplicateArtifactIds.add(normalizedArtifactId);
    }
    seenArtifactIds.add(normalizedArtifactId);
  }
  return [
    ...(input.artifactIds.some((artifactId) => artifactId.trim() === "")
      ? [`${input.ownerLabel} has a blank approved artifact id.`]
      : []),
    ...input.artifactIds
      .filter((artifactId) => artifactId.trim() !== "" && artifactId !== artifactId.trim())
      .map(
        (artifactId) => `${input.ownerLabel} has non-canonical approved artifact id ${artifactId}.`,
      ),
    ...[...duplicateArtifactIds].map(
      (artifactId) => `${input.ownerLabel} duplicates approved artifact id ${artifactId}.`,
    ),
  ];
}

export function sameApprovedArtifactIds(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
