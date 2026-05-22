# AI Project Analysis – stea-boilerplate-ui

## 1. Technology Stack Identification
- **Frontend:** React 18 + TypeScript 5.7, Vite 6, TanStack Router for routing, TanStack Query for server cache, Zustand for client state, Tailwind CSS 4 with Radix/shadcn-style primitives, MUI components; drag/drop and dashboard widgets baked in.
- **Runtime:** Node.js (Docker uses node:20-alpine), browser SPA; SignalR client for realtime.
- **Build tools:** Vite with Tailwind plugin, TanStackRouterVite generator, TypeScript project refs, ESLint 9.
- **Package managers:** npm (`dev`, `build`, `build:sync`, `lint`, `preview`).
- **Task runners:** npm scripts; `cpx` to sync built assets into Workchestra backend.
- **API protocol:** REST via axios (proxy to backend), OIDC via `oidc-client-ts`, SignalR websockets (`@microsoft/signalr`).

## 2. Dependency & Package Analysis
### Core dependencies
- **react / react-dom:** Core UI rendering.
- **@tanstack/react-router (+plugin/devtools):** Routing and generated route tree.
- **@tanstack/react-query:** Data fetching/caching for backend APIs.
- **zustand:** Client state stores.
- **axios:** REST client.
- **oidc-client-ts:** OIDC authentication/token management.
- **@microsoft/signalr:** Realtime hub connections.
- **react-hook-form + @hookform/resolvers + zod:** Form handling and validation.
- **@tanstack/react-table:** Table abstractions.
- **@xyflow/react:** Flow/diagram canvas.
- **gantt-task-react, react-grid-layout, react-big-calendar, react-day-picker:** Scheduling, layouts, calendar widgets.
- **Drag/drop:** dnd-kit suite and @hello-pangea/dnd for sortable/kanban.
- **UI libraries:** MUI (material + icons), Radix primitives (accordion/dialog/select/etc.), lucide-react/iconoir for icons, cmdk/vaul for command palette/drawer, sonner for toasts.
- **Styling:** tailwindcss 4 + tailwind-merge + tailwindcss-animate + tw-animate-css; class-variance-authority, clsx for class composition; next-themes for theming.
- **Date/time:** date-fns, dayjs.

### Dev dependencies
- **vite / @vitejs/plugin-react / @tailwindcss/vite:** Build, HMR, Tailwind integration.
- **TypeScript / @types-*:** Typing for React/Node/calendar.
- **eslint 9 stack:** @eslint/js, typescript-eslint, react hooks/refresh plugins, globals.
- **TanStack router tooling:** Devtools and plugin for static route tree generation.
- **cpx, rimraf:** File copy/cleanup utilities.

### Why dependencies matter (mapping)
- **Routing/data:** TanStack Router + Query connect UI to backend services.
- **State/forms:** Zustand for UI/session state; hook-form + zod enforce validation.
- **UI/UX:** Radix/MUI/shadcn components plus Tailwind theme provide reusable primitives; drag/drop and scheduling libs power dashboards and layouts.
- **Auth/realtime:** oidc-client-ts and SignalR maintain authenticated live experiences.
- **Build quality:** Vite + TypeScript + ESLint enforce typed, hot-reload workflows.

## 3. Frontend Architecture & Technologies
- **Routing:** TanStack Router with generated `routeTree.gen.ts`; routes under `src/routes`.
- **State management:** Zustand stores; TanStack Query for server data; hooks for theme/permissions/widgets.
- **Styling system:** Tailwind 4 custom palette; Radix primitives and shadcn-style components; MUI where useful.
- **API client:** axios hooks under services folders; Vite proxy targets backend base from env.
- **Realtime:** SignalR hooks for notifications/widgets.
- **Component patterns:** Reusable datatables, drag/drop boards, schedulers; feature folders for services/hooks/constants.

## 4. Backend Architecture & Technologies (consumer perspective)
- Consumes Workchestra backend REST/OIDC/SignalR; no backend implementation inside repo.

## 5. Database & Storage Systems
- None locally; relies on backend persistence. Client caches via Query/Zustand only.

## 6. Configuration & DevOps Analysis
- **Env handling:** Vite config loads `.env`, proxies `/api`, `/connect`, `/.well-known`; `VITE_PORT` controls dev server.
- **Build scripts:** `build` triggers TS then Vite; `build:sync` copies `dist` to backend assets path (aerotrak folder by default).
- **Docker:** Dev/prod compose/Dockerfiles (node:20-alpine).
- **Tooling:** Tailwind config, Vite alias `@` to `src`, ESLint config.

## 7. Key Plugins / Extensions / Special Tools
- **Vite plugins:** TanStackRouterVite, @tailwindcss/vite, @vitejs/plugin-react.
- **UI primitives:** Radix UI suite, shadcn-style ui components, MUI.
- **Auth/Realtime:** oidc-client-ts, SignalR.
- **Data/drag:** TanStack Table, dnd-kit, hello-pangea/dnd, xyflow, gantt-task-react.
- **Validation:** zod + hookform resolvers.

## 8. Architecture Overview & Flow
- **Request flow:** React components → hooks/services (axios + TanStack Query) → backend REST APIs. Responses cached; Zustand for local state. Auth tokens via oidc-client-ts; SignalR streams live data.
- **UI flow:** Router resolves routes to layout; Tailwind/Radix/MUI primitives render dashboards/tables/flows; drag/drop for widget arrangement.
- **Asset flow:** Optional `build:sync` publishes compiled assets into backend project.

## 9. Potential Risks, Warnings & Tech Debt
- **Testing gap:** No test runner dependencies (vitest/jest/cypress) → regression risk.
- **Dependency overlap:** Multiple UI/drag libs increase bundle size and maintenance.
- **Tailwind v4 maturity:** Early adoption may require adjustments as ecosystem stabilizes.
- **Auth/proxy coupling:** Proxy must align with backend OIDC/SignalR endpoints; misconfig risks auth failures.
- **Build sync fragility:** Hardcoded copy path may break on non-WSL/Windows setups.
- **5-Why (example: missing automated tests):**
  1. No testing dependencies configured.
  2. Project intended as fast-start boilerplate.
  3. Speed prioritized over quality gates.
  4. No shared testing standards enforced across UIs.
  5. Cross-repo release pressure discourages extra tooling.

