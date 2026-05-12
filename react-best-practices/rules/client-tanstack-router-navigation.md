---
title: TanStack Router — Navigation, Params, and Search
impact: HIGH
impactDescription: Prevents wrong router imports, type-unsafe params, and broken search param handling.
tags: tanstack-router, navigation, params, search, routing
---

## TanStack Router — Navigation, Params, and Search

**Impact: HIGH (type-safety, correct routing behaviour)**

This project uses **TanStack Router** — not `react-router-dom`. Never import routing
primitives from `react-router-dom`; they are not installed and will cause a runtime error.
All routing APIs come from `@tanstack/react-router`.

---

### Navigation — `useNavigate`

**Incorrect (wrong package):**

```tsx
import { useNavigate, useParams } from 'react-router-dom'; // ❌ not installed
```

**Correct:**

```tsx
import { useNavigate } from '@tanstack/react-router';

const navigate = useNavigate();

// Navigate to a path
navigate({ to: '/employee/$id', params: { id }, replace: true });

// Navigate and carry search params
navigate({ to: '/expiry', search: { status: 'expiring' } });

// Remove search params (clean URL)
navigate({ to: '/employee/$id', params: { id }, search: {}, replace: true });
```

---

### Reading path params — `Route.useParams()`

Always use the **route-scoped** `Route.useParams()`, not the global `useParams()`.
The route-scoped version is fully typed to the route's param shape.

**Incorrect (generic, untyped):**

```tsx
import { useParams } from '@tanstack/react-router';
const { id } = useParams(); // ❌ untyped, no autocomplete
```

**Correct:**

```tsx
export const Route = createFileRoute('/employee/$id/information')({
  component: EmployeeInformationPage,
});

function EmployeeInformationPage() {
  const { id } = Route.useParams(); // ✅ typed to { id: string }
}
```

---

### Reading search params — `validateSearch` + `Route.useSearch()`

Declare search param shape with a zod schema on the route. Read them
with `Route.useSearch()` — never with `useLocation` + manual URL parsing.

**Incorrect (manual URL parsing):**

```tsx
import { useLocation } from '@tanstack/react-router';
const location = useLocation();
const params = new URLSearchParams(location.search); // ❌ untyped, fragile
const status = params.get('status');
```

**Correct:**

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const searchParamsSchema = z.object({
  status: z.enum(['expiring', 'expired']).optional().default('expiring'),
  month:  z.string().optional(),
});

export const Route = createFileRoute('/expiry')({
  component: ExpiryPage,
  validateSearch: searchParamsSchema, // ✅ zod-validated, typed
});

function ExpiryPage() {
  const { status, month } = Route.useSearch(); // ✅ fully typed
}
```

---

### `<Link>` — typed route navigation in JSX

```tsx
import { Link } from '@tanstack/react-router';

// Simple link
<Link to="/employee">All Employees</Link>

// With path param
<Link to="/employee/$id" params={{ id: employee.id.toString() }}>
  {employee.name}
</Link>

// With search params
<Link to="/expiry" search={{ status: 'expiring' }}>
  View Expiring
</Link>
```

> Do not use `<a href="...">` for internal navigation — it causes a full page reload
> and bypasses TanStack Router's client-side routing.

---

### `useRouteContext` — reading context set in `__root.tsx`

Data passed through router context (e.g. `rolePermissions` set in `__root.tsx`
`beforeLoad`) is available in child routes via `Route.useRouteContext()` or the
`context` argument in `beforeLoad`.

```tsx
// In child route beforeLoad
beforeLoad: ({ context }) => {
  const { rolePermissions } = context as { rolePermissions?: string[] };
},
```
