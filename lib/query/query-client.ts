import { MutationCache, QueryClient, environmentManager } from "@tanstack/react-query";

const STALE_TIME_MS = 60_000;
const MAX_QUERY_RETRIES = 2;

/** A 4xx means the request itself is wrong (bad input, no access, not found),
 * so repeating it cannot succeed. Checked structurally because `lib/` must not
 * import from `services/`; `ApiError` is the error that carries this `status`. */
function isClientError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        retry: (failureCount, error) => !isClientError(error) && failureCount < MAX_QUERY_RETRIES,
      },
    },
    mutationCache: new MutationCache({
      // Returning the promise keeps the mutation pending until the invalidated
      // queries have refetched, so the UI never shows stale data after success.
      onSuccess: (_data, _variables, _onMutateResult, _mutation, { client, meta }) =>
        Promise.all(
          (meta?.invalidates ?? []).map((queryKey) => client.invalidateQueries({ queryKey })),
        ),
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

/** One client per server request, one shared client for the whole browser session. */
export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
