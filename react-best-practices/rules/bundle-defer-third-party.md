---
title: Defer Non-Critical Third-Party Libraries
impact: MEDIUM
impactDescription: loads after hydration
tags: bundle, third-party, analytics, defer
---

## Defer Non-Critical Third-Party Libraries

Analytics, logging, and error tracking don't block user interaction. Load them after hydration.

**Incorrect (blocks initial bundle):**

```tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Correct (loads after hydration):**

```tsx
import { useEffect, useState, ComponentType } from 'react'

export default function App({ children }: { children: React.ReactNode }) {
  const [Analytics, setAnalytics] = useState<ComponentType | null>(null)

  useEffect(() => {
    let mounted = true
    import('@vercel/analytics/react').then(m => {
      if (mounted) setAnalytics(() => m.Analytics)
    })
    return () => { mounted = false }
  }, [])

  return (
    <>
      {children}
      {Analytics ? <Analytics /> : null}
    </>
  )
}
```
