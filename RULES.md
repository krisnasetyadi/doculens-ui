# Rules: chat-ui structure & data layer

Mandatory rules for folder structure, API access, and state in chat-ui. They apply to humans and AI agents alike. Background and rationale: [RESTRUCTURE_RECOMMENDATIONS.md](RESTRUCTURE_RECOMMENDATIONS.md).

> **Transition period.** New code and code being migrated MUST follow these rules. Legacy code whose migration stage has not started yet may keep its old pattern (`services/resources/*`, `components/workspace/*`), but never add new files using the old pattern.

These rules are **not enforced by ESLint**. They are enforced through review and the checklist in §9, so every change must be checked against this file before it counts as done.

## 1. Deciding where code goes

Check from the top and use the first match:

| # | Question | Location |
| --- | --- | --- |
| 1 | Does it call the backend? | `services/<domain>/` |
| 2 | Used by only one route, or by pages within one route group? | `app/<route>/_components`, `_hooks`, `_lib`, `_types` |
| 3 | Part of a layout's shell (sidebar, header, footer, settings)? | That layout's `_components` / `_lib` |
| 4 | Knows a business domain and is used by more than one route? | `features/<domain>/` |
| 5 | Knows no domain at all and is reusable anywhere? | `components/`, `hooks/`, `lib/` |

Promote code to a more general level **only when a second consumer actually exists**, never in anticipation.

## 2. `app/`

- Route groups: `(marketing)` for `/` and `/pricing`, `(auth)`, `(workspace)`.
- Private folders prefixed with `_`: `_components/`, `_hooks/`, `_lib/`, `_types/`.
- A route **must not** import a sibling route's private folder. To share, lift the code to the parent layout or to `features/`.
- `page.tsx` is the composition point. Logic and interaction live in local components or hooks.

## 3. `features/<domain>/`

- Only for domains used by more than one route. Currently: `chat`, `sources`, `billing`, `pricing`, `auth`.
- Contents as needed: `components/`, `hooks/`, `lib/`, `types.ts`. Do not create empty subfolders.
- Grouped by domain, not by file count. A feature with a single file (e.g. `auth/lib/auth-schema.ts`) is valid.
- Feature-to-feature imports go one way only (e.g. `chat → sources`). Two-way dependencies are forbidden.

## 4. `components/`, `hooks/`, `lib/`

- **Generic, domain-free code only.** If it mentions chat, sources, billing, or pricing, it does not belong here.
- Group files when there are several of the same kind (`forms/`, `fields/`, `datatable/`). A standalone component stays at the root of `components/`; never create a folder holding a single file.
- `components/ui/` is shadcn-only and managed through the shadcn CLI. Never put hand-written components there.
- Generic infrastructure (`datatable/`, `fields/`) stays here even if it currently has few consumers.
- Forms use the adapters in `components/forms/` (`FormField`, `FormInput`, `FormPasswordInput`), not the `components/ui/form.tsx` stack.
- Code with no consumers is deleted, not moved.

## 5. `services/`

The only place that calls the backend. No React hooks, toasts, or UI state.

### Structure

```text
services/
  request-handler.ts      # used by every domain
  api-error.ts
  upload-progress.ts      # used by pdf-collections + chat-collections
  endpoint.ts             # base prefix, one per domain
  types.ts                # cross-domain types only
  <domain>/
    endpoint.ts           # the domain's static paths
    handler/
      <domain>.api.ts     # typed fetch functions
      <domain>.keys.ts    # query key factory
      <domain>.queries.ts # queryOptions + mutationOptions
    type/
      <entity>.type.ts
```

- The root of `services/` only holds files used by **at least two domains**. There is no `services/core/`.
- Domain folder name = the backend base prefix (`pdf-collections`, `source-folders`, `telegram-connections`, …).
- Small domains may omit `type/` or have no sub-paths besides `BASE`.

### Endpoints

- `services/endpoint.ts` only holds one base prefix per domain. It must match the Route Convention table in the backend `AGENTS.md` (`pdf-reader` and `hf-doculens-api`).
- `<domain>/endpoint.ts` only holds `BASE` and static paths as plain strings. **No** functions, parameters, `encodeURIComponent`, or query strings.
- Dynamic parts are assembled in the handler, and query strings go through `RequestHandler`'s `params` argument:

```ts
api.find<UploadSnapshot>(`${PDF_COLLECTIONS_ENDPOINT.UPLOADS}/${encodeURIComponent(uploadId)}`);
api.find<TextContentResponse>(`${id}/${PDF_COLLECTIONS_ENDPOINT.TEXT_CONTENT}`, { file_name, offset, limit });
```

- Handlers never write path-segment literals (`"activate"`) themselves. Static segments always come from the endpoint file.

### Handlers

- `<domain>.api.ts` exports `<domain>Api`: async functions with a **concrete return type**. Response-shape normalization (`Array.isArray(raw) ? raw : raw.items`) happens here, not in callers. No caller-chosen generics like `list<T>()`.
- `<domain>.keys.ts` exports `<domain>Keys` and **imports nothing**.
- `<domain>.queries.ts` exports `<domain>Queries` (`queryOptions`) and `<domain>Mutations` (`mutationOptions`).
- Across domains inside `services/`, only `*.keys.ts` may be imported.

```ts
// <domain>.keys.ts
export const pdfCollectionsKeys = {
  all: ["pdf-collections"] as const,
  list: () => [...pdfCollectionsKeys.all, "list"] as const,
};

// <domain>.queries.ts
export const pdfCollectionsQueries = {
  list: () => queryOptions({ queryKey: pdfCollectionsKeys.list(), queryFn: pdfCollectionsApi.list }),
};

export const pdfCollectionsMutations = {
  delete: () =>
    mutationOptions({
      mutationFn: pdfCollectionsApi.delete,
      meta: { invalidates: [pdfCollectionsKeys.all, storageKeys.all] },
    }),
};
```

### Queries & mutations

- Use `useQuery(xQueries.y())` and `useMutation(xMutations.y())` directly. **Do not** build generic wrappers (`useGetData`, `useMutationData`, etc.).
- Literal query-key arrays are forbidden outside `*.keys.ts`.
- Invalidation is declared in the mutation's `meta.invalidates`. Components only add `onSuccess` for UI effects (toast, closing a dialog), never to invalidate.
- Invalidation is **awaited**: `isPending` stays `true` until the related queries finish refetching, so the UI never shows stale data after a successful action.
- Invalidate the narrowest key that is still correct. Do not use `.all` when only the list changed and the domain has expensive detail queries.
- A record deleted while its page is open: call `queryClient.removeQueries` after navigating away, not invalidate.
- User-dependent queries include `userId` in the key. Logout calls `getQueryClient().clear()`.
- Retry policy and `staleTime` live only in `lib/query/query-client.ts`, not per query, unless a comment explains why.

### Domain hooks

- Write a custom hook only when it adds value: combining several queries, mapping data, or adding UI behavior.
- It lives in `features/<domain>/hooks/` or a route's `_hooks`, **never** in `services/`.

## 6. State

- **Server state → TanStack Query. Client state → Zustand.** Backend data must never be copied into a store.
- Stores do not call the API, except the auth flow (login/logout) through `*.api.ts`.
- The auth token is read through `lib/auth-token.ts`. `services/` never imports `stores/`.
- Changing the shape of persisted state (`doculens-workspace`) requires bumping `version` and writing `migrate`.

## 7. Import boundaries

| From ↓ may import → | own `app/` | `features/` | `services/` | `stores/` | `components/`, `hooks/`, `lib/` |
| --- | --- | --- | --- | --- | --- |
| `app/` | ✓ (not sibling routes) | ✓ | ✓ (`*.queries.ts`, types) | ✓ | ✓ |
| `features/` | ✗ | ✓ one way | ✓ (`*.queries.ts`, types) | ✓ | ✓ |
| `services/` | ✗ | ✗ | ✓ (cross-domain: `*.keys.ts` only) | ✗ | generic `lib/` |
| `stores/` | ✗ | types only | `*.api.ts`, types | ✓ | `lib/` |
| `components/`, `hooks/`, `lib/` | ✗ | ✗ | ✗ | ✗ | ✓ |

- UI components and hooks never import `*.api.ts` or `RequestHandler`.
- No barrel `index.ts` files; import each file directly.

## 8. Migration & commits

- Migrate one domain **completely** within one stage: the new queries are used everywhere **and** the old store cache is removed. Never keep two sources of truth for the same domain.
- Never mix path moves and behavior changes in the same commit.
- Small PRs per stage merged straight to `main`; avoid long-lived migration branches.
- Adding or changing a backend route: keep `services/endpoint.ts` / `services/<domain>/endpoint.ts` in sync with `pdf-reader` **and** `hf-doculens-api`.

## 9. Checklist before done

Checked manually, since no linter enforces these rules:

- [ ] Every new or moved file is placed according to §1.
- [ ] No imports from a sibling route's private folder.
- [ ] No domain code in `components/`, `hooks/`, or `lib/`.
- [ ] No `RequestHandler` / `*.api.ts` imported from UI components or hooks.
- [ ] No functions or parameters in endpoint files; no path-segment literals in handlers.
- [ ] No literal query-key arrays outside `*.keys.ts`; cross-domain imports in `services/` are keys only.
- [ ] Every new mutation has the right `meta.invalidates` (nothing missing, nothing excessive).
- [ ] No server data stored in Zustand.
- [ ] No dead imports after moves: grep for the old paths, then run `npx tsc --noEmit` — it must stay at 0 errors (baseline 0 on 2026-10-05; `next build` type-checks too).
