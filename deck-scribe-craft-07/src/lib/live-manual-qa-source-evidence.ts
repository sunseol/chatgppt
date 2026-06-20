import type { LiveManualQaIssue, LiveManualQaIssueCode } from "./live-manual-qa-evidence";
import { isHttpUrl, isPlaceholderSourceUrl, normalizedHttpUrl } from "./live-real-source-url";

export function realSourceOpenIssues(
  openedUrls: readonly string[],
  finalReportSourceUrls: readonly string[],
): readonly LiveManualQaIssue[] {
  const present = openedUrls.filter((url) => url.trim().length > 0);
  const invalid = present.filter((url) => !isHttpUrl(url));
  const placeholder = present.filter((url) => isPlaceholderSourceUrl(url));
  const reportSourceUrlSet = new Set(
    finalReportSourceUrls.flatMap((url) => normalizedHttpUrl(url)),
  );
  const openedReportSources = present
    .filter((url) => isHttpUrl(url) && !isPlaceholderSourceUrl(url))
    .filter((url) => {
      const [normalized] = normalizedHttpUrl(url);
      return normalized !== undefined && reportSourceUrlSet.has(normalized);
    });
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
    ...(placeholder.length === 0
      ? []
      : [
          issue(
            "placeholder_real_source_url",
            "Opened manual QA sources must not use placeholder, local, or reserved domains/addresses.",
            placeholder,
          ),
        ]),
    ...(present.length === 0 ||
    invalid.length > 0 ||
    placeholder.length > 0 ||
    openedReportSources.length > 0
      ? []
      : [
          issue(
            "opened_source_not_in_report",
            "Opened manual QA source must be present in the final report sources.",
            present,
          ),
        ]),
  ];
}

function issue(
  code: LiveManualQaIssueCode,
  message: string,
  refs: readonly string[],
): LiveManualQaIssue {
  return { code, message, refs };
}
