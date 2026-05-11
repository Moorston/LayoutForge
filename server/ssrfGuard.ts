/**
 * SSRF protection — blocks requests to private / internal networks.
 */

const BLOCKED_HOSTNAME_RE =
  /^(?:localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1?\]|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|fc00:.*|fe80:.*)$/i;

const BLOCKED_TLD_RE =
  /\.(?:local|internal|localhost|lan|home|corp|invalid)$/i;

export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAME_RE.test(h)) return true;
  if (BLOCKED_TLD_RE.test(h)) return true;
  return false;
}

/**
 * Resolve and validate a user-supplied URL string.
 * Blocks private/internal IPs and non-HTTP protocols.
 */
export function resolveRemoteUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("URL is required");
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : trimmed.startsWith("//")
      ? `https:${trimmed}`
      : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("Requests to private / internal networks are not allowed");
  }
  return parsed.href;
}
