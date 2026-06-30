import type { LiveManualQaIssue, LiveManualQaIssueCode } from "./live-manual-qa-evidence";

export function realSourceOpenIssues(openedUrls: readonly string[]): readonly LiveManualQaIssue[] {
  const present = openedUrls.filter((url) => url.trim().length > 0);
  const invalid = present.filter((url) => !isHttpUrl(url));
  return [
    ...(present.length > 0
      ? []
      : [
          issue(
            "missing_real_source_open",
            "At least one real source must be opened by the tester.",
            ["missing"],
          ),
        ]),
    ...(invalid.length === 0
      ? []
      : [
          issue(
            "invalid_real_source_url",
            "Opened manual QA sources must be real HTTP(S) URLs.",
            invalid,
          ),
        ]),
  ];
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function issue(
  code: LiveManualQaIssueCode,
  message: string,
  refs: readonly string[],
): LiveManualQaIssue {
  return { code, message, refs };
}
