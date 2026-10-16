/** A web address the server can fetch: http or https with a host. `new URL()` alone also accepts
 * `ftp:`, `mailto:` and `javascript:`, which the server then refuses. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}

/** One link per line, blank lines and surrounding spaces ignored. */
export function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export const HTTP_URL_MESSAGE = "Enter a valid URL starting with http:// or https://";
