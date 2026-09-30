/** A non-2xx API response. Still an `Error` carrying the server's own message,
 * so every existing `err.message` handler keeps working; `status` lets a
 * caller tell a limit refusal (413, 402) from any other failure. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** The upload was refused because of a size or storage limit, not because it broke. */
export function isLimitError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 413 || error.status === 402);
}
