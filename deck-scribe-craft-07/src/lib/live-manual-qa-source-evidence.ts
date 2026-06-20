import type { LiveManualQaIssue, LiveManualQaIssueCode } from "./live-manual-qa-evidence";

const PLACEHOLDER_HOSTS: ReadonlySet<string> = new Set([
  "example.com",
  "example.net",
  "example.org",
  "localhost",
]);

export function realSourceOpenIssues(
  openedUrls: readonly string[],
  finalReportSourceUrls: readonly string[],
): readonly LiveManualQaIssue[] {
  const present = openedUrls.filter((url) => url.trim().length > 0);
  const invalid = present.filter((url) => !isHttpUrl(url));
  const placeholder = present.filter((url) => isPlaceholderSourceUrl(url));
  const reportSourceUrlSet = new Set(finalReportSourceUrls.flatMap((url) => normalizedUrl(url)));
  const openedReportSources = present
    .filter((url) => isHttpUrl(url) && !isPlaceholderSourceUrl(url))
    .filter((url) => {
      const [normalized] = normalizedUrl(url);
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
            "Opened manual QA sources must not use placeholder or local domains.",
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

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isPlaceholderSourceUrl(value: string): boolean {
  try {
    const hostname = normalizeHostname(new URL(value).hostname);
    return (
      PLACEHOLDER_HOSTS.has(hostname) ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".invalid") ||
      hostname.endsWith(".test") ||
      isLocalNetworkHost(hostname)
    );
  } catch {
    return false;
  }
}

function normalizeHostname(value: string): string {
  return value.toLowerCase().replace(/^\[(.*)\]$/, "$1");
}

function isLocalNetworkHost(hostname: string): boolean {
  if (hostname === "::1" || hostname === "0.0.0.0") return true;
  const octets = parseIpv4Octets(hostname);
  if (octets === undefined) return false;
  const [first, second] = octets;
  if (first === undefined || second === undefined) return false;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function parseIpv4Octets(hostname: string): readonly number[] | undefined {
  const rawOctets = hostname.split(".");
  if (rawOctets.length !== 4) return undefined;
  const octets = rawOctets.map((octet) => Number.parseInt(octet, 10));
  return octets.every(
    (octet, index) => String(octet) === rawOctets[index] && octet >= 0 && octet <= 255,
  )
    ? octets
    : undefined;
}

function normalizedUrl(value: string): readonly string[] {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return [];
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "");
    return [url.toString()];
  } catch {
    return [];
  }
}

function issue(
  code: LiveManualQaIssueCode,
  message: string,
  refs: readonly string[],
): LiveManualQaIssue {
  return { code, message, refs };
}
