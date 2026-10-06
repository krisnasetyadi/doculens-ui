/** Hide the `user:pass@` userinfo segment of a connection string so a saved
 * DB password isn't sitting in plaintext on screen after the connect dialog closes. */
export function maskConnectionUrl(url: string): string {
  return url.replace(/:\/\/([^@/]+)@/, "://••••@");
}
