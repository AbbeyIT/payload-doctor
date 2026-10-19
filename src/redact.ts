// Local redaction: runs BEFORE any text reaches the model.
// Same value -> same placeholder, so the model can still reason about
// "the same email appears in two places" without seeing the real value.

const SENSITIVE_KEYS =
  "password|passwd|pwd|secret|token|api[_-]?key|apikey|authorization|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key";

export function createRedactor() {
  const seen = new Map<string, string>();
  const counts: Record<string, number> = {};

  const tag = (kind: string, value: string): string => {
    const key = `${kind}\u0000${value}`;
    let placeholder = seen.get(key);
    if (!placeholder) {
      counts[kind] = (counts[kind] ?? 0) + 1;
      placeholder = `[${kind}_${counts[kind]}]`;
      seen.set(key, placeholder);
    }
    return placeholder;
  };

  const apply = (input: string): string => {
    let out = input;

    // JSON: "password": "value"
    out = out.replace(
      new RegExp(`("(?:${SENSITIVE_KEYS})"\\s*:\\s*")([^"]*)(")`, "gi"),
      (m, pre: string, value: string, post: string) =>
        value ? `${pre}${tag("SECRET", value)}${post}` : m,
    );

    // XML: <password>value</password>
    out = out.replace(
      new RegExp(`(<(?:${SENSITIVE_KEYS})(?:\\s[^>]*)?>)([^<]+)(</(?:${SENSITIVE_KEYS})>)`, "gi"),
      (_m, pre: string, value: string, post: string) => `${pre}${tag("SECRET", value)}${post}`,
    );

    // Authorization headers
    out = out.replace(
      /\b(Bearer|Basic)\s+([A-Za-z0-9\-._~+/]{8,}=*)/g,
      (_m, scheme: string, value: string) => `${scheme} ${tag("TOKEN", value)}`,
    );

    // JWTs
    out = out.replace(
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
      (m) => tag("JWT", m),
    );

    // Emails
    out = out.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (m) => tag("EMAIL", m));

    // IPv4 addresses
    out = out.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, (m) => tag("IP", m));

    // International phone numbers (must start with +)
    out = out.replace(/\+\d[\d\s().-]{8,}\d/g, (m) => tag("PHONE", m));

    // Long opaque strings (API keys, hashes, base64 blobs)
    out = out.replace(/\b[A-Za-z0-9+/_-]{32,}={0,2}/g, (m) => tag("LONG_ID", m));

    return out;
  };

  return { apply, counts: () => ({ ...counts }) };
}
