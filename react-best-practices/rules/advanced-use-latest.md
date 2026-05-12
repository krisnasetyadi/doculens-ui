---
title: Stable Callback Refs to Avoid Stale Closures
impact: LOW
impactDescription: prevents effect re-runs
tags: advanced, hooks, refs, optimization
---

## Stable Callback Refs to Avoid Stale Closures

Access the latest version of a callback inside an effect without adding it to the dependency array. Prevents spurious effect re-runs while avoiding stale closures.

**Incorrect (effect re-runs on every callback change):**

```tsx
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => onSearch(query), 300)
    return () => clearTimeout(timeout)
  }, [query, onSearch]) // re-fires whenever parent re-renders with a new function ref
}
```

**Correct (ref-based pattern — works with React 18 stable):**

```tsx
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('')
  const onSearchRef = useRef(onSearch)

  // Keep ref current on every render without re-running the effect
  useLayoutEffect(() => {
    onSearchRef.current = onSearch
  })

  useEffect(() => {
    const timeout = setTimeout(() => onSearchRef.current(query), 300)
    return () => clearTimeout(timeout)
  }, [query]) // stable — onSearchRef.current is always fresh
}
```

> **Note on `useEffectEvent`:** React's `useEffectEvent` hook solves this same problem with cleaner syntax, but it is **not available in React 18 stable**. It was introduced as an experimental API in React canary builds and is expected in React 19+. Do not import it from `react` in this codebase — use the `useRef` pattern above instead.

Reference: [React docs — Separating Events from Effects](https://react.dev/learn/separating-events-from-effects)
