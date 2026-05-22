# Scope
- Stack convergence: React 18 + TypeScript 5.7, Vite 6, TanStack Router + TanStack Query, Zustand for client state, Tailwind CSS 4 with Radix/shadcn-style primitives; some use MUI in addition to shadcn.

# React Performance Practices
> See [react-best-practices/AGENTS.md](react-best-practices/AGENTS.md) for the full compiled
> performance rule set (waterfalls, bundle size, re-renders, JS micro-opts, advanced patterns).
> All rules in that document apply to this codebase unless overridden below.

# Global Code Rules (React flavor)
- SOLID/DRY/KISS/YAGNI; feature-first organization.
- Naming: PascalCase for components/hooks types; camelCase for vars/functions; kebab-case for files/folders; keep file name = default export when applicable.
- Readability: guard clauses; avoid deep prop drilling—prefer context or stores; limit component cyclomatic complexity.
- Modularity: feature folders with colocated UI, hooks, services, types, tests.
- Error handling: central axios instance with interceptors (auth, error mapping, retry rules); React Error Boundaries for page-level failures; never swallow promise rejections.
- Comments: “Why” not “what”; TSDoc for shared hooks/components; delete dead code.
- Logging: central logger; no console.log in committed code; redact PII; structured logs in services.
- Env/config: All runtime settings via Vite env (VITE_*); validate on startup; no secrets committed.

# Architecture & Components
- Folder pattern (recommended): src/{routes,components,features,hooks,stores,lib,styles,types}.
- Routing: TanStack Router with generated route tree; co-locate routes with loaders/actions; use suspense-friendly data APIs.
- State management: Server state → TanStack Query (queries/mutations with typed keys, staleTime, retry/backoff); Client/UI state → Zustand stores (selector + shallow); avoid duplicating server state in stores.
- Components: Smart (data) vs Presentational (pure); favor composition; avoid global singletons for UI state unless cross-cutting.
- Forms: react-hook-form + zod resolver; schema-first validation; reusable controlled inputs; optimistic UI only with proper rollback.
- API layer: Single axios client with baseURL from env; interceptors for auth (oidc-client-ts token), error normalization, optional tracing header; DTO ↔ view model mappers; abort via AbortController.
- Styling: Tailwind 4 utilities with consistent ordering (layout→box→typography→color→state→animation); use shadcn/Radix primitives; keep MUI usage consistent per feature (avoid mixing design systems inside one view); prefer CSS variables for theming; next-themes for dark mode.
- Accessibility: Enforce ARIA on custom components; keyboard and focus management for dialogs/menus; maintain color contrast.
- Assets: Prefer SVG/icons sets; lazy-load heavy charts/flows; use dynamic imports for large routes; image optimization (webp) where possible.

# Performance
- Prevent re-renders: memo for pure components; useCallback/useMemo for stable deps; selector-based Zustand; React Query select for shaping data.
- Lists: use key stability; virtualize large lists; provide trackBy-equivalent via keys.
- Network: dedupe queries with React Query; set cacheTime/staleTime intentionally; enable retries with backoff; paginate/segment large fetches.

# Security
- XSS: sanitize any HTML render; never trust server HTML; avoid dangerouslySetInnerHTML unless sanitized.
- CSRF/Auth: rely on backend OIDC; store tokens in memory when feasible; if using sessionStorage/localStorage, protect with same-site cookies and short TTL; always send credentials over HTTPS.
- CORS: do not weaken in client; keep proxy configs aligned with backend.
- Secrets: no secrets in repo; only VITE_* placeholders.

# Testing & Quality
- Tests: Jest/Vitest for unit; React Testing Library for components; Playwright/Cypress for E2E as needed.
- Coverage: focus on core hooks, services, and critical components; avoid snapshot overuse.
- Mocks: MSW for API; stub time/UUID where applicable.
- Lint/Format: ESLint (strict) + Prettier; enforce import sorting and hooks rules; tailwind class sorting consistent.

# DevOps & CI/CD
- Vite build optimized; analyze bundles for heavy deps (xyflow, gantt, MUI); code-split where large.
- Docker: multi-stage (build then serve with nginx/caddy); copy only dist; non-root runtime.
- pre-commit: lint + typecheck + test (affected where possible).

# Additional Frontend-Specific Standards (selected best-of-breed from repos)
- Use TanStack Router + Query consistently (pattern from admin-ui/aerotrak/pps).
- Use axios interceptors and Vite proxy for local dev (pattern from admin-ui/aerotrak/pps); for library-mode builds (generic/repair), ensure baseUrl is configurable and avoid hardcoding.
- Keep shadcn/Radix primitives as the base UI kit; limit MUI to isolated feature slices; do not mix within the same component tree.
- For embeddable builds (generic, repair), preserve library build output paths and avoid coupling to browser globals; provide ESM entry points.
- SignalR usage (where present): encapsulate in a client module; auto-reconnect with backoff; clean up connections on unmount.

> - Dates: always `dayjs`; never `new Date().toLocaleDateString()` or other date libraries.

# AI Behavior Rules
- Always read the repo's `AGENTS_PROJECT_ANALYSIS.md` before edits; respect its stack (TanStack Router/Query, Zustand, Tailwind 4, Radix/shadcn, axios, oidc-client-ts).
- Do not introduce Redux/MobX/Recoil or alternate routers without approval.
- Keep changes minimal and in-scope; preserve existing style and formatting; do not reflow Tailwind class order unless improving consistency.
- Add or update tests when altering logic; avoid touching unrelated files.