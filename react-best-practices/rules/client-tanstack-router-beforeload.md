---
title: TanStack Router — Auth Guards with beforeLoad
impact: HIGH
impactDescription: Prevents unauthorised access to routes; ensures guards run before render, not inside components.
tags: tanstack-router, beforeLoad, auth, permissions, redirect, guards
---

## TanStack Router — Auth Guards with `beforeLoad`

**Impact: HIGH (security, correct auth enforcement)**

Route-level permission checks belong in `beforeLoad`, not inside the component body.
`beforeLoad` runs **before** React renders the component, so the user never sees
a flash of protected content. Component-level guards (`if (!hasPermission) return null`)
render the component first and redirect/hide after — never use them for security.

---

### Standard permission guard pattern

Read the store with `.getState()` (not the hook — `beforeLoad` runs outside React).
Check the permission, then `throw redirect(...)` to abort navigation.

**Incorrect (guard inside component body):**

```tsx
function ProtectedPage() {
  const { userProfile } = useUserProfileStore(); // ❌ renders first, guards after
  if (!userProfile?.rolePermissions?.includes(REQUIRED_PERMISSION)) {
    return <Navigate to="/" />;
  }
  return <PageContent />;
}
```

**Correct (`beforeLoad` guard):**

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useUserProfileStore } from '@/stores/user-profile-store';
import { AEROTRAKER_PERMISSIONS } from '@/constants/permission';

export const Route = createFileRoute('/employee/$id/information')({
  component: EmployeeInformationPage,
  beforeLoad: () => {
    const { userProfile } = useUserProfileStore.getState(); // ✅ .getState() outside React
    if (userProfile?.rolePermissions) {
      const hasPermission = userProfile.rolePermissions.includes(
        AEROTRAKER_PERMISSIONS.AEROTRAKER_EMPLOYEE_VIEW_DETAIL,
      );
      if (!hasPermission) {
        throw redirect({ to: '/' }); // ✅ throw — not return
      }
    }
  },
});
```

> `throw redirect(...)` — not `return redirect(...)`. TanStack Router requires
> `throw` to abort navigation; a plain `return` is ignored.

---

### Index route redirect pattern

Use an index route with `beforeLoad` to redirect to the default child tab/page.
This keeps the default tab logic in one place instead of spread across components.

```tsx
// src/routes/employee/$id/index.tsx
export const Route = createFileRoute('/employee/$id/')({
  beforeLoad: ({ params, search }) => {
    const { userProfile } = useUserProfileStore.getState();
    if (userProfile?.rolePermissions) {
      const hasPermission = userProfile.rolePermissions.includes(
        AEROTRAKER_PERMISSIONS.AEROTRAKER_EMPLOYEE_VIEW_DETAIL,
      );
      if (!hasPermission) {
        throw redirect({ to: '/' });
      }
    }
    // Always redirect index → default child route
    throw redirect({
      to: '/employee/$id/information',
      params: { id: params.id },
      search,         // ✅ forward search params through the redirect
    });
  },
});
```

---

### Reading router context in `beforeLoad`

For context set in `__root.tsx` (e.g. `rolePermissions` injected by the root
`beforeLoad`), access it via the `context` argument — no store read needed:

```tsx
beforeLoad: ({ context }) => {
  const { rolePermissions } =
    (context as { rolePermissions?: string[] }) ?? {};

  if (rolePermissions && rolePermissions.length > 0) {
    if (!rolePermissions.includes(REQUIRED_PERMISSION)) {
      throw redirect({ to: '/' });
    }
  }
},
```

---

### Rules summary

| Rule | Reason |
|------|--------|
| Use `beforeLoad`, not component-level guards | Runs before render — no flash of protected content |
| Use `useUserProfileStore.getState()` in `beforeLoad` | `beforeLoad` runs outside React — hooks are not allowed |
| Always `throw redirect(...)`, never `return` | TanStack Router requires `throw` to abort navigation |
| Forward `search` through index redirects | Preserves URL search params across redirects |
| Import `redirect` from `@tanstack/react-router` | Not from `react-router-dom` |
