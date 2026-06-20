import { validSources } from "./live-golden-path-e2e-evidence";
import {
  liveGoldenPathIssue,
  type LiveGoldenPathE2EIssue,
  type LiveGoldenPathSource,
} from "./live-golden-path-e2e-contract";
import { normalizedHttpUrl } from "./live-real-source-url";

export function sourceIssues(
  sources: readonly LiveGoldenPathSource[],
): readonly LiveGoldenPathE2EIssue[] {
  const valid = validSources(sources);
  const duplicateRefs = duplicateSourceRefs(valid);
  const distinctUrls = new Set(valid.flatMap((source) => normalizedHttpUrl(source.url)));
  return [
    ...(duplicateRefs.length === 0
      ? []
      : [
          liveGoldenPathIssue(
            "duplicate_live_source",
            "Live Golden Path sources must have distinct URLs and artifact ids.",
            duplicateRefs,
          ),
        ]),
    ...(distinctUrls.size >= 3
      ? []
      : [
          liveGoldenPathIssue(
            "insufficient_live_sources",
            "At least three distinct real source URLs are required.",
            [String(distinctUrls.size)],
          ),
        ]),
    ...(valid.some((source) => source.role === "official" || source.role === "primary")
      ? []
      : [
          liveGoldenPathIssue(
            "missing_primary_source",
            "At least one primary or official source URL is required.",
            valid.map((source) => source.artifactId),
          ),
        ]),
  ];
}

function duplicateSourceRefs(sources: readonly LiveGoldenPathSource[]): readonly string[] {
  return [
    ...duplicateValues(sources.flatMap((source) => normalizedHttpUrl(source.url))).map(
      (url) => `url:${url}`,
    ),
    ...duplicateValues(sources.map((source) => source.artifactId.trim())).map(
      (artifactId) => `artifact:${artifactId}`,
    ),
  ];
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values.filter((item) => item.length > 0)) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }
  return [...duplicates];
}
