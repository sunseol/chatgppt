import type { LiveManualQaIssue, LiveManualQaIssueCode } from "./live-manual-qa-evidence";

const NON_LIVE_SLIDE_ID_MARKERS = [
  "placeholder",
  "template",
  "sample",
  "example",
  "mock",
  "fixture",
  "test",
  "fake",
] as const;

type SlidePresenceIssueCode = Extract<
  LiveManualQaIssueCode,
  "missing_slide_regeneration" | "missing_title_edit"
>;
type SlideActionRefKind = "regenerated" | "title_edit";

export function liveManualQaSlideActionIssues(
  regeneratedSlideIds: readonly string[],
  editedTitleSlideIds: readonly string[],
): readonly LiveManualQaIssue[] {
  const invalidRefs = [
    ...invalidSlideActionRefs("regenerated", regeneratedSlideIds),
    ...invalidSlideActionRefs("title_edit", editedTitleSlideIds),
  ];
  const invalidIssues =
    invalidRefs.length === 0
      ? []
      : [
          issue(
            "invalid_manual_qa_slide_action",
            "Manual QA slide actions must reference only canonical live slide ids.",
            invalidRefs,
          ),
        ];
  return [
    ...presenceIssue(
      "missing_slide_regeneration",
      regeneratedSlideIds,
      "At least one slide must be regenerated during manual QA.",
    ),
    ...presenceIssue(
      "missing_title_edit",
      editedTitleSlideIds,
      "At least one title edit must survive the QA flow.",
    ),
    ...invalidIssues,
  ];
}

export function liveSlideIds(values: readonly string[]): readonly string[] {
  return nonEmpty(values).filter(isLiveSlideId);
}

function invalidSlideActionRefs(
  actionKind: SlideActionRefKind,
  values: readonly string[],
): readonly string[] {
  return nonEmpty(values)
    .filter((value) => !isLiveSlideId(value))
    .map((value) => `${actionKind}:${value}`);
}

function presenceIssue(
  code: SlidePresenceIssueCode,
  values: readonly string[],
  message: string,
): readonly LiveManualQaIssue[] {
  const liveIds = liveSlideIds(values);
  const refs = nonEmpty(values);
  return liveIds.length > 0 ? [] : [issue(code, message, refs.length > 0 ? refs : ["missing"])];
}

function isLiveSlideId(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    value === value.trim() &&
    !NON_LIVE_SLIDE_ID_MARKERS.some((marker) => normalized.includes(marker))
  );
}

function nonEmpty(values: readonly string[]): readonly string[] {
  return values.filter((value) => value.trim().length > 0);
}

function issue(
  code: LiveManualQaIssueCode,
  message: string,
  refs: readonly string[],
): LiveManualQaIssue {
  return { code, message, refs };
}
