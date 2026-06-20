export function canonicalCoordinatorThreadIdentityIssues(input: {
  readonly coordinatorThreadId: string;
}): readonly string[] {
  return isNonCanonicalNonBlank(input.coordinatorThreadId)
    ? ["Project thread manifest coordinator thread id is not canonical."]
    : [];
}

export function canonicalWorkerThreadIdentityIssues(input: {
  readonly stage: string;
  readonly threadId: string;
  readonly lastCompletedTurnId: string;
}): readonly string[] {
  const ownerLabel = workerOwnerLabel(input);
  return [
    ...(isNonCanonicalNonBlank(input.threadId)
      ? [`${ownerLabel} has a non-canonical thread id.`]
      : []),
    ...(isNonCanonicalNonBlank(input.lastCompletedTurnId)
      ? [`${ownerLabel} has a non-canonical last completed turn id.`]
      : []),
  ];
}

function workerOwnerLabel(input: { readonly stage: string; readonly threadId: string }): string {
  const threadId = input.threadId.trim();
  return threadId ? `Worker thread ${threadId}` : `Worker thread for ${input.stage}`;
}

function isNonCanonicalNonBlank(value: string): boolean {
  return value.trim() !== "" && value !== value.trim();
}
