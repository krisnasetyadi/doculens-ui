# Scope
- DocuLens frontend (`chat-ui`). Stack: Next.js 16 App Router, React 19, TypeScript (strict), TanStack Query v5 for server state, Zustand for client state, Tailwind CSS 4 with shadcn/Radix primitives, react-hook-form + zod.
- The only backend consumer contract is `services/endpoint.ts` against the FastAPI backends `pdf-reader` (local dev) and `hf-doculens-api` (deployed HF Space).

# Structure & Data Layer Rules (read first)
- **Before creating, moving, or deleting any file, or touching API calls, queries, or stores, read [RULES.md](RULES.md) and follow it.** Run its §9 checklist before reporting a change as done.
- RULES.md wins over anything in this file that conflicts with it.
- The restructure is in progress; [RESTRUCTURE_RECOMMENDATIONS.md](RESTRUCTURE_RECOMMENDATIONS.md) holds the rationale and the stage plan. Legacy patterns (`services/resources/<domain>-api.ts`, `components/workspace/*`, data cached in Zustand) stay only in code whose stage has not started — never add new files in those patterns.

# React Performance Practices
> See [react-best-practices/AGENTS.md](react-best-practices/AGENTS.md) for the full compiled
> performance rule set (waterfalls, bundle size, re-renders, JS micro-opts, advanced patterns).
> All rules in that document apply to this codebase unless overridden below. Its TanStack Router
> rules do not apply (this app uses the Next.js App Router).

# Global Code Rules
- SOLID/DRY/KISS/YAGNI.
- Naming: PascalCase for components and types; camelCase for variables, functions, and hooks (`useX`); kebab-case for files and folders.
- Readability: guard clauses; avoid deep prop drilling — prefer composition, context, or stores; keep component complexity low.
- Error handling: HTTP errors are normalized centrally in `RequestHandler` (`ApiError` with the backend's message and status; 401 redirects to login). Never swallow promise rejections (`.catch(() => {})`) — surface them through query/mutation error state.
- Comments: "why", not "what"; TSDoc for shared hooks/components; delete dead code.
- No `console.log` in committed code; never log tokens or PII.
- Env/config: runtime settings via `NEXT_PUBLIC_*` env vars (e.g. `NEXT_PUBLIC_API_URL`); no secrets committed.
- Dates: always `dayjs`; never `new Date().toLocaleDateString()` or another date library.

# Architecture & Components
- Folder layout, import boundaries, and the data layer are defined in [RULES.md](RULES.md).
- State: server state → TanStack Query (`queryOptions`/`mutationOptions` from `services/<domain>/handler/*.queries.ts`); client/UI state → Zustand (selectors, never copies of server data).
- Components: favor composition; keep `"use client"` boundaries as narrow as practical.
- Forms: react-hook-form + zod resolver; schema-first validation; optimistic UI only with proper rollback.
  - Use the shared adapters in `components/forms/`, not `components/ui/form.tsx`'s `Form`/`FormItem`/`FormControl`/`FormLabel`/`FormMessage` stack, for any new form field.
  - `FormField` is the one generic react-hook-form adapter: `<FormField control={form.control} name="x" label="X" render={(field) => <YourInput {...field} />} />` — renders label, field, and the zod error from `fieldState` in one call.
  - `FormInput` and `FormPasswordInput` are thin wrappers over `FormField` for the two shapes that repeat across auth/settings forms. Only add a new thin wrapper when a field shape is genuinely repeated across call sites; otherwise use `FormField` with a custom `render`.
- API layer: fetch-based `RequestHandler` (`services/request-handler.ts`), not axios. Auth header and 401 redirect are handled centrally there, not per call site.
  - Every backend domain is registered under exactly ONE base path; list/create/delete/activate/etc. are sub-paths under it (e.g. `api/v1/pdf-collections` then `upload`, `activate`, `{id}`). Never reintroduce a domain scattered across several prefixes.
  - **Backend routes are mirrored in two repos** — `pdf-reader` and `hf-doculens-api` — that must stay functionally identical. Any route change needs the same change in both backends' `router/*.py` and in `services/endpoint.ts` / `services/<domain>/endpoint.ts`.
- Styling: Tailwind 4 utilities with consistent ordering (layout → box → typography → color → state → animation); shadcn/Radix primitives; CSS variables for theming; `next-themes` for dark mode. Follow the `doculens-design` skill for new or restyled UI.
- Accessibility: ARIA on custom components; keyboard and focus management for dialogs/menus; maintain color contrast.
- Assets: prefer SVG icons; lazy-load heavy views (e.g. the PDF viewer) with dynamic imports.

# Performance
- Prevent re-renders: memo for pure components; stable callbacks where they are dependencies; selector-based Zustand; TanStack Query `select` for shaping data.
- Lists: stable keys; virtualize large lists.
- Network: let TanStack Query dedupe and cache; staleTime/retry policy lives only in `lib/query/query-client.ts`; paginate large fetches.

# Security
- XSS: sanitize any HTML render; never trust server HTML; avoid `dangerouslySetInnerHTML` unless sanitized.
- Auth: JWT from the backend, read through the auth token helpers (sessionStorage with cookie fallback); always over HTTPS outside local dev.
- CORS: never weaken it from the client.

# Testing & Quality
- Unit tests use `node:test` + `node:assert/strict`, colocated with the code as `*.test.ts` / `*.test.mjs`. Add or update tests when changing logic.
- Type check: `npx tsc --noEmit` must stay at 0 errors (baseline 0 on 2026-10-05). `next build` type-checks too (`ignoreBuildErrors` is off).
- No ESLint is configured; the rules in RULES.md are enforced through its §9 checklist.
- Package manager: npm (`package-lock.json`, `npm ci` in the Dockerfile).

# Deployment
- Docker multi-stage build with Next.js `output: "standalone"`.

# AI Behavior Rules
- Read [RULES.md](RULES.md) before structural or data-layer changes (see top of this file).
- Do not introduce Redux/MobX/Recoil, another router, or axios without approval.
- Keep changes minimal and in scope; preserve existing style and formatting; do not reflow Tailwind class order unless improving consistency.
- Avoid touching unrelated files.
