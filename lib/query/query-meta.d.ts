import type { QueryKey } from "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Query keys the MutationCache invalidates once this mutation succeeds. */
      invalidates?: QueryKey[];
    };
  }
}
