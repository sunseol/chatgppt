const RESERVED_DOCUMENTATION_HOSTS = ["example.com", "example.net", "example.org"] as const;

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isRealHttpSourceUrl(value: string): boolean {
  return isHttpUrl(value) && !isPlaceholderSourceUrl(value);
}

export function isPlaceholderSourceUrl(value: string): boolean {
  try {
    const hostname = normalizeHostname(new URL(value).hostname);
    return (
      hostname === "localhost" ||
      isReservedDocumentationHost(hostname) ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".invalid") ||
      hostname.endsWith(".test") ||
      isLocalNetworkHost(hostname)
    );
  } catch {
    return false;
  }
}

export function normalizedHttpUrl(value: string): readonly string[] {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return [];
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "");
    return [url.toString()];
  } catch {
    return [];
  }
}

function normalizeHostname(value: string): string {
  return value.toLowerCase().replace(/^\[(.*)\]$/, "$1");
}

function isReservedDocumentationHost(hostname: string): boolean {
  return RESERVED_DOCUMENTATION_HOSTS.some(
    (reservedHost) => hostname === reservedHost || hostname.endsWith(`.${reservedHost}`),
  );
}

function isLocalNetworkHost(hostname: string): boolean {
  if (hostname === "::1" || hostname === "0.0.0.0") return true;
  const octets = parseIpv4Octets(hostname);
  if (octets === undefined) return false;
  const [first, second, third] = octets;
  if (first === undefined || second === undefined || third === undefined) return false;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113)
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
