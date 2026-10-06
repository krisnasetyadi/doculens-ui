import type { MutationFunctionContext, QueryKey } from "@tanstack/react-query";

interface Snapshot<TData> {
  previous?: TData;
}

/** `onMutate` / `onError` pair for `mutationOptions`: applies `update` to the
 * cached query right away and restores the previous value if the request
 * fails. Pair it with `meta.invalidates` so the server's answer still wins. */
export function optimisticUpdate<TData, TVariables>(
  queryKey: QueryKey,
  update: (data: TData, variables: TVariables) => TData,
) {
  return {
    onMutate: async (variables: TVariables, { client }: MutationFunctionContext): Promise<Snapshot<TData>> => {
      // A refetch already in flight would overwrite the optimistic value with stale data.
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<TData>(queryKey);
      if (previous !== undefined) client.setQueryData<TData>(queryKey, update(previous, variables));
      return { previous };
    },
    onError: (
      _error: unknown,
      _variables: TVariables,
      snapshot: Snapshot<TData> | undefined,
      { client }: MutationFunctionContext,
    ) => {
      if (snapshot?.previous !== undefined) client.setQueryData(queryKey, snapshot.previous);
    },
  };
}
