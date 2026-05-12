---
title: Deduplicate Global Event Listeners
impact: LOW
impactDescription: single listener for N components
tags: client, event-listeners, subscription, singleton
---

## Deduplicate Global Event Listeners

Use a module-level singleton to share global event listeners across component instances. Each component subscribes/unsubscribes via a callback set; the actual browser listener is registered only once.

**Incorrect (N instances = N listeners):**

```tsx
function useKeyboardShortcut(key: string, callback: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === key) {
        callback()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key, callback])
}
```

When using the `useKeyboardShortcut` hook multiple times, each instance will register a new listener.

**Correct (N instances = 1 listener — module-level singleton):**

```tsx
// keyboardShortcuts.ts — singleton, registered once per app lifetime
const keyCallbacks = new Map<string, Set<() => void>>()

let registered = false
function ensureListener() {
  if (registered || typeof window === 'undefined') return
  registered = true
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.metaKey && keyCallbacks.has(e.key)) {
      keyCallbacks.get(e.key)!.forEach(cb => cb())
    }
  })
}

export function subscribeShortcut(key: string, cb: () => void) {
  ensureListener()
  if (!keyCallbacks.has(key)) keyCallbacks.set(key, new Set())
  keyCallbacks.get(key)!.add(cb)
  return () => {
    const set = keyCallbacks.get(key)
    if (set) {
      set.delete(cb)
      if (set.size === 0) keyCallbacks.delete(key)
    }
  }
}
```

```tsx
// useKeyboardShortcut.ts
import { useEffect } from 'react'
import { subscribeShortcut } from './keyboardShortcuts'

export function useKeyboardShortcut(key: string, callback: () => void) {
  useEffect(() => subscribeShortcut(key, callback), [key, callback])
}

function Profile() {
  // Multiple shortcuts share the same listener
  useKeyboardShortcut('p', () => { /* ... */ })
  useKeyboardShortcut('k', () => { /* ... */ })
}
```
