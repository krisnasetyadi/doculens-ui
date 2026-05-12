---
title: Feature Service Pattern — API, Query Hooks, Forms, and dayjs
impact: HIGH
impactDescription: Consistent data-fetching, type-safe forms, and date handling across all features; reduces duplication and prevents regressions.
tags: tanstack-query, react-query, use-query-hooks, dayjs, react-hook-form, zod, api-layer, feature-pattern
---

## Feature Service Pattern — API, Query Hooks, Forms, and dayjs

**Impact: HIGH (consistency, type-safety, maintainability)**

All features in this codebase share one boilerplate pattern for API clients,
query hooks, form components, and date handling. Deviating from it creates
invisible incompatibilities (broken auth tokens, missed error toasts, cache
key collisions). Follow this pattern exactly; extend it rather than replace it.

---

### 1 — Folder structure per feature service

Every new API domain lives under `src/hooks/services/<domain>/`.

```
src/hooks/services/<domain>/
  base.ts          ← axios client wired to the feature's VITE_APP_* base URL
  endpoint.ts      ← enum of all URL segments
  handlers/
    <entity>-api.ts  ← handler factories (one file per entity)
    index.ts         ← re-exports all handlers
  type/
    <entity>.types.ts  ← request/response types
  index.ts           ← public barrel (re-exports handlers + types)
```

**Incorrect (flat file, mixed concerns):**

```typescript
// src/hooks/services/my-feature.ts  ← everything jammed in one file
import axios from "axios";
export const getItems = () => axios.get("/items");
export const createItem = (body: any) => axios.post("/items", body);
```

**Correct (structured folder):**

```
src/hooks/services/my-feature/
  base.ts
  endpoint.ts
  handlers/my-entity-api.ts
  type/my-entity.types.ts
  index.ts
```

---

### 2 — `base.ts` — always use `createApiClient`

Use the shared `createApiClient` from `../api-utils`. Never instantiate axios directly. The factory handles auth token injection, error toasts, and retry logic automatically.

**Incorrect:**

```typescript
import axios from "axios";

export const myApi = axios.create({
  baseURL: import.meta.env.VITE_APP_MY_FEATURE,
});

export const apiMyCall = (url: string, method: string, body?: any) =>
  myApi.request({ url, method, data: body });
```

**Correct (`src/hooks/services/my-feature/base.ts`):**

```typescript
import { createApiClient, type ApiCallParams } from "../api-utils";
import { HttpMethod } from "@/types/https";

const myFeatureClient = createApiClient({
  baseURL: import.meta.env.VITE_APP_MY_FEATURE,
});

export const apiMyFeatureCall = <T>(
  params: Omit<ApiCallParams, "method"> & { method: string }
): Promise<T> => {
  return myFeatureClient.call<T>({
    ...params,
    method: params.method as HttpMethod,
  });
};

export { HttpMethod };
```

> **Why:** `createApiClient` auto-injects the OIDC access token from
> `useUserProfileStore`, normalizes errors into toast messages, and shares
> the axios instance for connection reuse. Bypassing it breaks auth.

---

### 3 — `endpoint.ts` — enum for all URL segments

**Incorrect:**

```typescript
// Inline strings scattered across handler files
url: "my-feature/items"
url: `my-feature/items/${id}`
```

**Correct (`src/hooks/services/my-feature/endpoint.ts`):**

```typescript
export enum MY_FEATURE_ENDPOINT {
  ITEMS  = "items",
  ITEM   = "item",
  GROUPS = "groups",
}
```

---

### 4 — Handler factories — the `{ name, handle }` shape

Every handler must return `{ name: string, handle: fn }`. This is what
`useGetData` / `usePostData` / `usePutData` / `useDeleteData` expect.

#### 4a — GET (list with params) — encode params into `name`

```typescript
// src/hooks/services/my-feature/handlers/item-api.ts
import { HttpMethod } from "@/types/https";
import { apiMyFeatureCall } from "../base";
import { MY_FEATURE_ENDPOINT } from "../endpoint";
import type { ItemListParams, ItemListResponse } from "../type/item.types";

export const getItems = (params?: ItemListParams) => ({
  name: `getItems_${params?.page ?? 1}_${params?.pageSize ?? 10}_${params?.search ?? ""}`,
  handle: (): Promise<ItemListResponse> =>
    apiMyFeatureCall<ItemListResponse>({
      url: MY_FEATURE_ENDPOINT.ITEMS,
      method: HttpMethod.GET,
      params: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
        search: params?.search,
      },
    }),
});
```

> **Key rule:** Include every varying param in `name`, separated by `_`.
> `useGetData` splits names on `_` to build the TanStack Query key array.
> Omitting a param causes stale data to be served from cache when params change.

#### 4b — GET (single by ID)

```typescript
export const getItemById = (id: string | number) => ({
  name: `getItemById_${id}`,
  handle: (): Promise<Item> =>
    apiMyFeatureCall<Item>({
      url: `${MY_FEATURE_ENDPOINT.ITEM}/${id}`,
      method: HttpMethod.GET,
    }),
});
```

#### 4c — POST / PUT / DELETE — no params in `name`

```typescript
export const createItem = () => ({
  name: "createItem",
  handle: (body: CreateItemPayload): Promise<Item> =>
    apiMyFeatureCall<Item>({
      url: MY_FEATURE_ENDPOINT.ITEMS,
      method: HttpMethod.POST,
      body,
    }),
});

export const updateItem = () => ({
  name: "updateItem",
  handle: ({ id, body }: { id: string; body: UpdateItemPayload }): Promise<Item> =>
    apiMyFeatureCall<Item>({
      url: `${MY_FEATURE_ENDPOINT.ITEM}/${id}`,
      method: HttpMethod.PUT,
      body,
    }),
});

export const deleteItem = () => ({
  name: "deleteItem",
  handle: (id: string): Promise<void> =>
    apiMyFeatureCall<void>({
      url: `${MY_FEATURE_ENDPOINT.ITEM}/${id}`,
      method: HttpMethod.DELETE,
    }),
});
```

#### 4d — Search / autocomplete (for combobox dropdowns)

```typescript
export const searchItems = (search: string) => ({
  name: `searchItems_${search}`,
  handle: (): Promise<Array<{ label: string; value: number }>> =>
    apiMyFeatureCall<Item[]>({
      url: `${MY_FEATURE_ENDPOINT.ITEMS}/search`,
      method: HttpMethod.GET,
      params: { search },
    }).then((items) =>
      items.map((item) => ({ label: item.name, value: item.id }))
    ),
});
```

---

### 5 — Using `use-query-hooks` in components

Import only from `@/hooks/services/use-query-hooks`. Never call `useQuery` /
`useMutation` directly in feature components.

#### 5a — `useGetData` — standard auto-fetching query

```typescript
import { useGetData } from "@/hooks/services/use-query-hooks";
import { getItems } from "@/hooks/services/my-feature";

// Always-on query
const { data, isLoading, error } = useGetData(getItems({ page: 1 }));

// Conditionally enabled (e.g. only fetch when a sheet/dialog is open)
const { data } = useGetData(getItems(), { enabled: isOpen });
```

> `useGetData` sets `staleTime: 5min` and `gcTime: 10min` by default.
> Do NOT override these per-component; change them in `use-query-hooks.ts`
> globally if the default is wrong for the domain.

#### 5b — `useGetConditionalData` — lazy / on-demand query

Use this when a query must only run on an explicit action (e.g., a button click),
not on mount.

```typescript
import { useGetConditionalData } from "@/hooks/services/use-query-hooks";
import { getItemById } from "@/hooks/services/my-feature";

const query = useGetConditionalData(getItemById(selectedId));

const handlePreview = () => {
  query.refetch(); // triggered manually
};
```

#### 5c — `usePostData` / `usePutData` / `useDeleteData` — mutations

Always use `.mutateAsync(payload, { onSuccess, onError, onSettled })`. This is the **single standard** for all mutations in this codebase.

- `onSuccess` → happy path: toast, invalidate, reset form, close sheet
- `onError` → error toast with normalized message
- `onSettled` → always runs (equivalent of `finally`): clear loading flags, run cache invalidation that must always fire regardless of outcome

```typescript
import { usePostData, usePutData, useDeleteData, useInvalidateQueries } from "@/hooks/services/use-query-hooks";
import { createItem, updateItem, deleteItem } from "@/hooks/services/my-feature";
import { toastManager } from "@/lib/toast-manager";

const invalidate = useInvalidateQueries();
const createMutation = usePostData(createItem());
const updateMutation = usePutData(updateItem());
const deleteMutation = useDeleteData(deleteItem());

// Create
const onSubmit = (data: CreateItemPayload) => {
  setIsSubmitting(true);

  createMutation.mutateAsync(data, {
    onSuccess: () => {
      toastManager.showSuccess("Item created successfully");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toastManager.showError(
        "Failed to create item",
        error instanceof Error ? error.message : String(error),
      );
    },
    onSettled: () => {
      setIsSubmitting(false);
      invalidate([["getItems"]]);
    },
  });
};

// Update
const onUpdate = ({ id, data }: { id: string; data: UpdateItemPayload }) => {
  setIsSubmitting(true);

  updateMutation.mutateAsync({ id, body: data }, {
    onSuccess: () => {
      toastManager.showSuccess("Item updated successfully");
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toastManager.showError(
        "Failed to update item",
        error instanceof Error ? error.message : String(error),
      );
    },
    onSettled: () => {
      setIsSubmitting(false);
      invalidate([["getItems"]]);
    },
  });
};

// Delete
const onDelete = (id: string) => {
  setIsDeleting(true);

  deleteMutation.mutateAsync(id, {
    onSuccess: () => {
      toastManager.showSuccess("Item deleted successfully");
      setConfirmOpen(false);
    },
    onError: (error: Error) => {
      toastManager.showError(
        "Failed to delete item",
        error instanceof Error ? error.message : String(error),
      );
    },
    onSettled: () => {
      setIsDeleting(false);
      invalidate([["getItems"]]);
    },
  });
};
```

> **Inline side-effect fetches** (e.g. inside `onValueChange` where you can't use `async`) — use `.then().catch()` only in that specific case:
> ```typescript
> onValueChange={(value) => {
>   fetchNextNumber(value)
>     .then((res) => form.setValue("itemNo", res.data))
>     .catch((err) => toastManager.showError("Failed", err.message));
> }}
> ```
> Do **not** use `.then().catch()` or bare `try/catch` anywhere else for mutations.

> **`useInvalidateQueries` vs `refetch`:**
> - `invalidate` → after mutations; lets React Query decide when to refetch
> - `refetch` → manual "Refresh" button or polling; forces immediate network request

#### 5d — Cache key invalidation must match the `name` prefix

```typescript
// Handler name: "getItems_1_10_"
// Invalidate ALL pages of getItems at once using the shared prefix:
await invalidate(["getItems"]);

// Invalidate a specific page only:
await invalidate(["getItems_1_10_"]);

// Invalidate multiple queries in parallel:
await invalidate([["getItems"], ["getItemById_42"]]);
```

---

### 6 — Form components — prefer `src/components/forms`

Always use the typed form primitives from `@/components/forms` before reaching
for raw shadcn or MUI inputs. They are already wired to `react-hook-form` with
proper label, error message, and accessibility handling.

| Need | Component |
|------|-----------|
| Text / number / email | `<FormInput>` |
| Dropdown (static options) | `<FormSelect>` |
| Dropdown (searchable static) | `<FormSelectSearchable>` |
| Autocomplete (async search) | `<FormComboboxAsync>` |
| Autocomplete (static list) | `<FormComboboxStatic>` |
| Date picker | `<FormDatePicker>` |
| Date range picker | `<FormDateRangePicker>` |
| Time picker | `<FormTimePicker>` |
| Textarea | `<FormTextarea>` |
| Checkbox | `<FormCheckbox>` |
| Tag input | `<FormInputTag>` |
| Multi-select (async) | `<FormMultipleComboboxAsync>` |
| Multi-select (static) | `<FormMultipleComboboxStatic>` |

**Incorrect (raw shadcn Input not wired to form):**

```tsx
import { Input } from "@/components/ui/input";

<Input
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Enter name"
/>
```

**Correct (typed, form-aware):**

```tsx
import { FormInput } from "@/components/forms";

<FormInput
  control={form.control}
  name="name"
  label="Name"
  placeholder="Enter name"
  required
/>
```

#### When to create a new special form component

Only create a new component under `src/components/forms/` when **all** of these
are true:
1. None of the existing primitives above covers the UX requirement.
2. The component will be reused across ≥2 features.
3. It wraps a `FormField` from `@/components/ui/form` (keeps react-hook-form
   integration consistent).

**Do NOT** create a new component just to change styling — use the
`wrapperClassName` / `labelClassName` / `inputClassName` props first.

If only one feature needs a special input, keep it inside the feature folder
(`src/routes/<feature>/components/`) and do not export it globally.

---

### 7 — Date handling — always use `dayjs`, never `new Date()` for display

`dayjs` is the project standard. Do not use `date-fns`, `moment`, or raw
`Date` methods for formatting or parsing user-visible dates.

#### 7a — Formatting dates from API strings

```typescript
// ❌ Incorrect — brittle, locale-sensitive, no type safety
const formatted = new Date(createdAt).toLocaleDateString();

// ✅ Correct
import dayjs from "dayjs";

const formatted = dayjs(createdAt).format("DD MMM YYYY");        // "10 Apr 2026"
const withTime  = dayjs(createdAt).format("DD MMM YYYY HH:mm"); // "10 Apr 2026 14:30"
```

#### 7b — Parsing free-text or user input dates

Use the `parseInputDate` utility pattern (already in `form-datepicker.tsx`) for
handling multiple formats from user input:

```typescript
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const ACCEPTED_FORMATS = [
  "DD/MM/YYYY",
  "D/M/YYYY",
  "YYYY-MM-DD",
  "D MMM YYYY",
];

function parseUserDate(raw: string): dayjs.Dayjs | null {
  for (const fmt of ACCEPTED_FORMATS) {
    const d = dayjs(raw, fmt, true); // strict mode
    if (d.isValid()) return d;
  }
  const loose = dayjs(raw);
  return loose.isValid() ? loose : null;
}
```

> Use `strict: true` (third argument) when iterating known formats to avoid
> false positives. Fall back to loose parse only after all formats fail.

#### 7c — Computing relative time and comparisons

```typescript
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// Relative time
dayjs(expiryDate).fromNow();        // "in 3 days", "2 months ago"

// Comparison
dayjs(expiryDate).isBefore(dayjs()); // true if expired
dayjs(expiryDate).diff(dayjs(), "day"); // days until expiry

// Adding / subtracting
dayjs().add(30, "day").format("YYYY-MM-DD");
```

#### 7d — Storing and sending dates to the API

Store as ISO-8601 strings (`YYYY-MM-DD` or full ISO). `FormDatePicker` already
outputs ISO strings — pass them to the API payload as-is.

```typescript
// ✅ ISO string to API
const payload = {
  expiryDate: form.getValues("expiryDate"), // "2026-12-31" from FormDatePicker
};

// ✅ Convert dayjs back to ISO for payload
const iso = dayjs(selectedDate).format("YYYY-MM-DD");
```

---

### 8 — Full wiring example (sheet with form + query)

```tsx
// src/routes/my-feature/components/add-item-sheet.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Form } from "@/components/ui/form";
import { FormInput, FormSelect, FormDatePicker } from "@/components/forms";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { usePostData, useGetData, useInvalidateQueries } from "@/hooks/services/use-query-hooks";
import { createItem, getGroups } from "@/hooks/services/my-feature";
import { toastManager } from "@/lib/toast-manager";
import dayjs from "dayjs";

const schema = z.object({
  name:      z.string().min(1, "Name is required"),
  groupId:   z.string().min(1, "Group is required"),
  startDate: z.string().min(1, "Start date is required"),
});

type FormValues = z.infer<typeof schema>;

interface AddItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddItemSheet({ open, onOpenChange }: AddItemSheetProps) {
  const invalidate = useInvalidateQueries();

  // Fetch supporting data only when sheet is open
  const { data: groupsData } = useGetData(getGroups(), { enabled: open });
  const createMutation = usePostData(createItem());

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", groupId: "", startDate: "" },
  });

  const groupOptions = groupsData?.data?.map((g) => ({
    value: String(g.id),
    label: g.name,
  })) ?? [];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (data: FormValues) => {
    setIsSubmitting(true);

    createMutation.mutateAsync(
      {
        name:      data.name,
        groupId:   Number(data.groupId),
        startDate: dayjs(data.startDate).format("YYYY-MM-DD"),
      },
      {
        onSuccess: () => {
          toastManager.showSuccess("Item created successfully");
          form.reset();
          onOpenChange(false);
        },
        onError: (error: Error) => {
          toastManager.showError(
            "Failed to create item",
            error instanceof Error ? error.message : String(error),
          );
        },
        onSettled: () => {
          setIsSubmitting(false);
          invalidate([["getItems"]]);
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="aero:sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>Add Item</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="aero:flex aero:flex-col aero:gap-4 aero:p-6">
            <FormInput
              control={form.control}
              name="name"
              label="Name"
              required
            />

            <FormSelect
              control={form.control}
              name="groupId"
              label="Group"
              options={groupOptions}
              placeholder="Select group..."
              required
            />

            <FormDatePicker
              control={form.control}
              name="startDate"
              label="Start Date"
              required
            />

            <SheetFooter>
              <Button type="submit" loading={createMutation.isPending}>
                Save
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
```

---

### 9 — Zustand stores — client/UI state only

Use Zustand **only for client-side state** that is not server-fetched data (use TanStack Query for that). Good candidates: auth profile, UI filters, sort state, column config, workspace context.

#### 9a — Store definition — always type the interface

Every store lives in `src/stores/<name>-store.ts` and exports a single `create<State>()` hook.

```typescript
// src/stores/my-feature-store.ts
import { create } from "zustand";

interface MyFeatureState {
  // State
  selectedId: string | null;
  isDrawerOpen: boolean;

  // Actions — always co-located with state, not in components
  setSelectedId: (id: string | null) => void;
  setIsDrawerOpen: (open: boolean) => void;
  reset: () => void;
}

const initialState = {
  selectedId: null,
  isDrawerOpen: false,
};

export const useMyFeatureStore = create<MyFeatureState>((set) => ({
  ...initialState,

  setSelectedId: (id) => set({ selectedId: id }),
  setIsDrawerOpen: (open) => set({ isDrawerOpen: open }),
  reset: () => set(initialState),
}));
```

> Keep `initialState` as a separate object so `reset()` is trivially correct and doesn't drift.

#### 9b — Consuming a store in a component — destructure only what you need

```typescript
// ✅ Correct — only subscribes to the slice it needs
const { selectedId, setSelectedId } = useMyFeatureStore();

// ❌ Incorrect — subscribes to the entire store; re-renders on any state change
const store = useMyFeatureStore();
```

#### 9c — Reading state outside React (e.g. in `beforeLoad`, route guards, axios interceptors)

Use `.getState()` — does not subscribe, never causes a re-render.

```typescript
// In a TanStack Router beforeLoad guard
beforeLoad: () => {
  const { userProfile } = useUserProfileStore.getState();
  if (!userProfile?.rolePermissions.includes(REQUIRED_PERMISSION)) {
    throw redirect({ to: "/" });
  }
},

// In an axios interceptor (api-utils)
const { token } = useUserProfileStore.getState();
```

> **Rule:** Inside React components → `useStore()` hook.
> Outside React (guards, interceptors, callbacks outside render) → `useStore.getState()`.

#### 9d — Store with derived logic using `get`

When an action needs to read current state before writing, use the `get` parameter.

```typescript
export const useFilterStore = create<FilterState>((set, get) => ({
  filters: [],

  addFilter: (field: string) => {
    const { filters } = get(); // read current state
    const alreadyExists = filters.some((f) => f.field === field);
    if (!alreadyExists) {
      set({ filters: [...filters, { field, value: "" }] });
    }
  },

  removeFilter: (field: string) => {
    const newFilters = get().filters.filter((f) => f.field !== field);
    set({
      filters: newFilters,
      // Reset related state when filters are cleared
      ...(newFilters.length === 0 && { selectedFilterField: "" }),
    });
  },
}));
```

#### 9e — Do NOT duplicate server state in Zustand

```typescript
// ❌ Incorrect — copying server data into a store creates stale-data bugs
const { data } = useGetData(getItems());
useEffect(() => {
  setItemsInStore(data); // now you have two sources of truth
}, [data]);

// ✅ Correct — keep server data in React Query; derive what you need inline
const { data: itemsData } = useGetData(getItems());
const items = itemsData?.data ?? [];
```

> Zustand = UI state (open/closed, selected ID, filter config).
> TanStack Query = server state (lists, details, paginated data).
> Never let them overlap.

#### 9f — Persisting state to localStorage

Use the pattern in `useWorkSpaceStore` — write to `localStorage` inside the setter, read from it in the initial value:

```typescript
export const useWorkSpaceStore = create<WorkspaceState>((set) => ({
  workspace: JSON.parse(localStorage.getItem("workspace") || "{}"),

  setWorkspace: (workspace) => {
    localStorage.setItem("workspace", JSON.stringify(workspace));
    set({ workspace });
  },
}));
```

> Only persist non-sensitive data. Never store tokens in `localStorage`.

---

### 10 — Decision tree: reuse vs create

```
Need a form field?
  └─ Does src/components/forms have it? → USE IT (FormInput, FormSelect, etc.)
       └─ No → Is it reused across ≥2 features?
            ├─ Yes → Create in src/components/forms/, follow FormField wrapper
            └─ No  → Create in src/routes/<feature>/components/, keep it local

Need to display / format a date?
  └─ Use dayjs(value).format("DD MMM YYYY")
  └─ Never new Date().toLocaleDateString()

Need to fetch data?
  └─ Create handler factory in src/hooks/services/<domain>/handlers/
  └─ Use useGetData / usePostData / usePutData / useDeleteData
  └─ Never call useQuery / useMutation directly in feature components

Need to invalidate after mutation?
  └─ Use useInvalidateQueries(["handlerName"])  ← not refetch()
  └─ refetch() only for manual "Refresh" buttons or polling

Need to store state?
  ├─ Is it data fetched from the server? → TanStack Query (never duplicate in Zustand)
  ├─ Is it UI state (open/closed, selected ID, filters, sort)? → Zustand store in src/stores/
  ├─ Reading store inside a React component? → useMyStore() hook
  └─ Reading store outside React (guard, interceptor, callback)? → useMyStore.getState()
```
