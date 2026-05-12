---
title: Use useTransition for Non-Urgent State Updates
impact: LOW
impactDescription: reduces re-renders and improves perceived responsiveness
tags: rendering, transitions, useTransition, loading, state
---

## Use useTransition for Non-Urgent State Updates

Use `useTransition` to mark **synchronous state updates** as non-urgent — keeping the UI responsive while React defers re-rendering lower-priority work. Do **not** put async operations (network requests) inside `startTransition`; `isPending` resets before the promise resolves, and errors become unhandled rejections.

For network loading states, rely on TanStack Query's `isLoading` / `isFetching` flags instead.

**Incorrect (manual loading state with `useState`):**

```tsx
function SearchResults() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (value: string) => {
    setIsLoading(true)
    setQuery(value)
    const data = await fetchResults(value)
    setResults(data)
    setIsLoading(false) // may never run if component unmounts
  }
}
```

**Also incorrect (async work inside `startTransition`):**

```tsx
// ❌ isPending resets before fetchResults resolves — spinner disappears too early
// ❌ errors from fetchResults become unhandled rejections
startTransition(async () => {
  const data = await fetchResults(value)
  setResults(data)
})
```

**Correct — `useTransition` marks the state update as non-urgent; TanStack Query owns the loading state:**

```tsx
import { useTransition, useState } from 'react'
import { useGetData } from '@/hooks/services/use-query-hooks'
import { getSearchResults } from '@/hooks/services/my-feature'

function SearchResults() {
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // TanStack Query handles fetching + its own isLoading/isFetching flags
  const { data, isFetching } = useGetData(getSearchResults(query))

  const handleSearch = (value: string) => {
    // Mark the query state update as non-urgent — input stays responsive
    startTransition(() => {
      setQuery(value) // synchronous only — no async inside startTransition
    })
  }

  return (
    <>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {(isPending || isFetching) && <Spinner />}
      <ResultsList results={data?.items ?? []} />
    </>
  )
}
```

**When to use `useTransition`:**

- Marking filter/tab/search input state updates as non-urgent so the current UI stays interactive
- Deferring expensive re-renders caused by a state change (e.g. switching between a large list view)
- Any **synchronous** state update where you want `isPending` to reflect "React is re-rendering"

**When NOT to use `useTransition`:**

- Tracking whether a network request is in-flight → use TanStack Query `isLoading` / `isFetching`
- Wrapping `mutateAsync` or any `async` function → use `isPending` from `useMutation` instead

Reference: [useTransition](https://react.dev/reference/react/useTransition)
